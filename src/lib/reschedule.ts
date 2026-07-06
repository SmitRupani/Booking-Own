import { and, eq, gt, gte, lt, ne, inArray, sql, count } from 'drizzle-orm';
import { getDb } from './db/client';
import { bookings, users, resources, blocks, equipmentItems } from './db/schema';
import { POLICIES, isWithinAdvanceWindow, hasConsecutiveBookings, calculateTotalHours, canUserBook } from './policies';
import { checkBookingAvailability } from './inventory';
import { ValidationError, ConflictError } from './errors';
import { getStartOfDayUTC, toIST } from './timezone';

interface BookingItem {
    itemId: string | number;
    name?: string;
    qty: number;
}

interface ResourceRules {
    requiresApproval?: boolean;
    slotMinutes?: number;
    studentsOnly?: boolean;
}

interface OperatingHours {
    useCustom?: boolean;
    schedule?: Array<{ open: boolean; startHour: number; endHour: number }>;
}

export interface RescheduleParams {
    booking: typeof bookings.$inferSelect;
    user: typeof users.$inferSelect;
    resource: typeof resources.$inferSelect;
    newStart: Date;
    newEnd: Date;
}

export interface RescheduleValidationResult {
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
}

/**
 * Validate if a booking can be rescheduled to a new time slot.
 */
export async function validateReschedule(params: RescheduleParams): Promise<RescheduleValidationResult> {
    const { booking, user, resource, newStart, newEnd } = params;
    const db = getDb();

    const now = new Date();
    const nowIST = toIST(now);

    // 1. Status Check: Only CONFIRMED or PENDING bookings can be rescheduled
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
        return {
            allowed: false,
            reason: `Cannot reschedule ${booking.status.toLowerCase()} bookings. Only confirmed or pending bookings can be rescheduled.`,
        };
    }

    // Block rescheduling for group bookings
    if (booking.isGroupBooking) {
        return {
            allowed: false,
            reason: 'Group bookings cannot be rescheduled. Please cancel and create a new group booking if needed.',
        };
    }

    // Check if user is permanently blocked
    if (user.blocked) {
        return {
            allowed: false,
            reason: 'Your account has been blocked. You cannot reschedule bookings.',
        };
    }

    // Check if user is blocked or suspended before allowing reschedule
    const userCanBook = canUserBook(user);
    if (!userCanBook.allowed) {
        return {
            allowed: false,
            reason: userCanBook.reason || 'You are not permitted to reschedule bookings.',
        };
    }

    // Per-booking reschedule limit
    if (booking.rescheduleCount >= POLICIES.MAX_RESCHEDULE_PER_BOOKING) {
        return {
            allowed: false,
            reason: `This booking has already been rescheduled ${booking.rescheduleCount} time(s). Maximum ${POLICIES.MAX_RESCHEDULE_PER_BOOKING} reschedule allowed per booking.`,
        };
    }

    // Monthly reschedule limit
    const reschedMonthStart = getStartOfDayUTC(new Date(nowIST.getFullYear(), nowIST.getMonth(), 1));
    const reschedMonthEnd = new Date(reschedMonthStart);
    reschedMonthEnd.setMonth(reschedMonthEnd.getMonth() + 1);

    const userBookings = await db
        .select({ rescheduleHistory: bookings.rescheduleHistory })
        .from(bookings)
        .where(eq(bookings.userId, user.id));

    let monthlyRescheduleCount = 0;
    for (const b of userBookings) {
        const history = b.rescheduleHistory as Array<{ rescheduledAt: string }> | null;
        if (history) {
            for (const entry of history) {
                const rescheduledAt = new Date(entry.rescheduledAt);
                if (rescheduledAt >= reschedMonthStart && rescheduledAt < reschedMonthEnd) {
                    monthlyRescheduleCount++;
                }
            }
        }
    }

    if (monthlyRescheduleCount >= POLICIES.MAX_RESCHEDULE_PER_MONTH) {
        return {
            allowed: false,
            reason: `You can only reschedule ${POLICIES.MAX_RESCHEDULE_PER_MONTH} bookings per month. You have already rescheduled ${monthlyRescheduleCount} booking(s) this month.`,
        };
    }

    // Time window restriction (cannot reschedule within 2 hours of start)
    const bookingStart = new Date(booking.startAt);
    const hoursUntilStart = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < POLICIES.RESCHEDULE_BLOCK_WINDOW_HOURS) {
        return {
            allowed: false,
            reason: `Cannot reschedule within ${POLICIES.RESCHEDULE_BLOCK_WINDOW_HOURS} hours of booking start time. Please cancel and create a new booking instead.`,
        };
    }

    // Prevent rescheduling to the past
    if (newStart < now) {
        return {
            allowed: false,
            reason: 'Cannot reschedule to a past time',
        };
    }

    // Check advance booking window
    if (!isWithinAdvanceWindow(newStart)) {
        return {
            allowed: false,
            reason: `Bookings can only be made up to ${POLICIES.ADVANCE_BOOKING_DAYS} days in advance`,
        };
    }

    // Check resource-specific operating hours
    const operatingHours = resource.operatingHours as OperatingHours | null;
    if (operatingHours?.useCustom && operatingHours.schedule) {
        const newStartIST = toIST(newStart);
        const newEndIST = toIST(newEnd);
        const dayOfWeek = newStartIST.getDay();
        const daySchedule = operatingHours.schedule[dayOfWeek];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        if (!daySchedule.open) {
            return {
                allowed: false,
                reason: `${resource.name} is closed on ${dayNames[dayOfWeek]}s`,
            };
        }

        const startHour = newStartIST.getHours();
        const endHour = newEndIST.getHours();
        const endMinutes = newEndIST.getMinutes();

        if (startHour < daySchedule.startHour) {
            return {
                allowed: false,
                reason: `${resource.name} opens at ${daySchedule.startHour}:00 on ${dayNames[dayOfWeek]}s. Your booking starts at ${startHour}:00.`,
            };
        }

        if (endHour > daySchedule.endHour || (endHour === daySchedule.endHour && endMinutes > 0)) {
            return {
                allowed: false,
                reason: `${resource.name} closes at ${daySchedule.endHour}:00 on ${dayNames[dayOfWeek]}s. Your booking ends at ${endHour}:${String(endMinutes).padStart(2, '0')}.`,
            };
        }
    }

    // Validate duration based on resource type
    const duration = (newEnd.getTime() - newStart.getTime()) / (1000 * 60);

    if (booking.kind === 'FACILITY' || booking.kind === 'ROOM') {
        if (duration < POLICIES.MIN_BOOKING_DURATION_MINUTES) {
            return {
                allowed: false,
                reason: `Booking duration must be at least ${POLICIES.MIN_BOOKING_DURATION_MINUTES} minutes`,
            };
        }
        if (duration > POLICIES.MAX_BOOKING_DURATION_MINUTES) {
            return {
                allowed: false,
                reason: `Booking duration cannot exceed ${POLICIES.MAX_BOOKING_DURATION_MINUTES} minutes (${POLICIES.MAX_BOOKING_DURATION_MINUTES / 60} hours)`,
            };
        }
    } else if (booking.kind === 'EQUIPMENT') {
        const isSportsEquipment = resource.type === 'SPORTS_EQUIPMENT';

        if (isSportsEquipment) {
            const maxDuration = POLICIES.SPORTS_EQUIPMENT_BORROW_MINUTES;
            const minDuration = POLICIES.MIN_BOOKING_DURATION_MINUTES;

            if (duration < minDuration) {
                return {
                    allowed: false,
                    reason: `Sports equipment borrow duration must be at least ${minDuration} minutes`,
                };
            }

            if (duration > maxDuration) {
                return {
                    allowed: false,
                    reason: `Sports equipment borrow duration cannot exceed ${maxDuration} minutes`,
                };
            }
        } else {
            const expectedDuration = POLICIES.LAB_EQUIPMENT_BORROW_MINUTES;

            if (duration !== expectedDuration) {
                return {
                    allowed: false,
                    reason: `Lab equipment borrow duration must be exactly ${expectedDuration} minutes (24 hours)`,
                };
            }
        }
    } else if (booking.kind === 'LIBRARY') {
        if (duration !== POLICIES.LIBRARY_BOOK_BORROW_MINUTES) {
            return {
                allowed: false,
                reason: `Library book borrow duration must be exactly ${POLICIES.LIBRARY_BOOK_BORROW_MINUTES} minutes (14 days)`,
            };
        }
    }

    // Check for conflicts with blocks
    const conflictingBlocks = await db
        .select()
        .from(blocks)
        .where(
            and(
                eq(blocks.resourceId, booking.resourceId),
                lt(blocks.startAt, newEnd),
                gt(blocks.endAt, newStart)
            )
        );

    if (conflictingBlocks.length > 0) {
        return {
            allowed: false,
            reason: `Resource is blocked: ${conflictingBlocks[0].reason}`,
        };
    }

    // Check for conflicts with existing bookings (for facilities/rooms only)
    if (booking.kind === 'FACILITY' || booking.kind === 'ROOM') {
        const conflictingBooking = await db
            .select()
            .from(bookings)
            .where(
                and(
                    eq(bookings.resourceId, booking.resourceId),
                    ne(bookings.id, booking.id),
                    inArray(bookings.status, ['CONFIRMED', 'PENDING']),
                    lt(bookings.startAt, newEnd),
                    gt(bookings.endAt, newStart)
                )
            );

        if (conflictingBooking.length > 0) {
            return {
                allowed: false,
                reason: 'Time slot already booked',
            };
        }

        // Check shared turf conflicts
        if (resource.sharedGroupId) {
            const sharedResources = await db
                .select()
                .from(resources)
                .where(
                    and(
                        eq(resources.sharedGroupId, resource.sharedGroupId),
                        ne(resources.id, booking.resourceId)
                    )
                );

            const sharedResourceIds = sharedResources.map(r => r.id);

            if (sharedResourceIds.length > 0) {
                const sharedConflict = await db
                    .select()
                    .from(bookings)
                    .where(
                        and(
                            inArray(bookings.resourceId, sharedResourceIds),
                            ne(bookings.id, booking.id),
                            inArray(bookings.status, ['CONFIRMED', 'PENDING']),
                            lt(bookings.startAt, newEnd),
                            gt(bookings.endAt, newStart)
                        )
                    );

                if (sharedConflict.length > 0) {
                    const conflictResource = sharedResources.find(r => r.id === sharedConflict[0].resourceId);
                    return {
                        allowed: false,
                        reason: `Cannot reschedule: ${conflictResource?.name} is booked during this time (shared turf rule)`,
                    };
                }
            }
        }
    }

    // Check inventory availability for equipment/library bookings
    if ((booking.kind === 'EQUIPMENT' || booking.kind === 'LIBRARY') && booking.items) {
        const items = booking.items as unknown as BookingItem[];

        const itemsToCheck = await Promise.all(
            items.map(async (item) => {
                const itemResult = await db
                    .select()
                    .from(equipmentItems)
                    .where(eq(equipmentItems.id, Number(item.itemId)));
                
                const equipmentItem = itemResult[0];
                if (!equipmentItem) {
                    throw new Error(`Item ${item.name} not found`);
                }
                return {
                    itemId: item.itemId,
                    qty: item.qty,
                    totalQty: equipmentItem.qtyTotal,
                    name: item.name,
                };
            })
        );

        const availabilityCheck = await checkBookingAvailability(
            itemsToCheck,
            newStart,
            newEnd,
            booking.id
        );

        if (!availabilityCheck.success) {
            return {
                allowed: false,
                reason: availabilityCheck.message || 'Items not available for selected time',
            };
        }
    }

    // Check daily limit for target day
    const targetDayStart = getStartOfDayUTC(toIST(newStart));
    const targetDayEnd = new Date(targetDayStart);
    targetDayEnd.setDate(targetDayEnd.getDate() + 1);

    const targetDayBookingsCountResult = await db
        .select({ count: count() })
        .from(bookings)
        .where(
            and(
                eq(bookings.userId, user.id),
                ne(bookings.id, booking.id),
                eq(bookings.kind, booking.kind),
                inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
                gte(bookings.startAt, targetDayStart),
                lt(bookings.startAt, targetDayEnd)
            )
        );

    const targetDayBookingsCount = targetDayBookingsCountResult[0]?.count ?? 0;

    const dailyLimitMap: Record<string, number> = {
        FACILITY: POLICIES.MAX_FACILITY_BOOKINGS_PER_DAY,
        ROOM: POLICIES.MAX_ROOM_BOOKINGS_PER_DAY,
        EQUIPMENT: POLICIES.MAX_EQUIPMENT_BOOKINGS_PER_DAY,
        LIBRARY: POLICIES.MAX_LIBRARY_BOOKINGS_PER_DAY,
    };
    const dailyLimit = dailyLimitMap[booking.kind] || 0;

    if (dailyLimit > 0 && targetDayBookingsCount >= dailyLimit) {
        return {
            allowed: false,
            reason: `You can only make ${dailyLimit} ${booking.kind.toLowerCase()} bookings per day`,
        };
    }

    // Monthly limits
    const monthStart = getStartOfDayUTC(new Date(nowIST.getFullYear(), nowIST.getMonth(), 1));
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const monthlyBookings = await db
        .select()
        .from(bookings)
        .where(
            and(
                eq(bookings.userId, user.id),
                ne(bookings.id, booking.id),
                inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING', 'COMPLETED', 'RETURNED']),
                gte(bookings.startAt, monthStart),
                lt(bookings.startAt, monthEnd)
            )
        );

    if (booking.kind === 'FACILITY') {
        const facilityBookings = monthlyBookings.filter((b) => b.kind === 'FACILITY').map((b) => ({ start: b.startAt, end: b.endAt }));
        const totalHours = calculateTotalHours(facilityBookings);
        const newHours = (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60);

        if (totalHours + newHours > POLICIES.MAX_FACILITY_HOURS_PER_MONTH) {
            return {
                allowed: false,
                reason: `Monthly facility limit exceeded. You have used ${totalHours.toFixed(1)} hours out of ${POLICIES.MAX_FACILITY_HOURS_PER_MONTH} hours this month.`,
            };
        }
    } else if (booking.kind === 'ROOM') {
        const roomBookings = monthlyBookings.filter((b) => b.kind === 'ROOM').map((b) => ({ start: b.startAt, end: b.endAt }));
        const totalHours = calculateTotalHours(roomBookings);
        const newHours = (newEnd.getTime() - newStart.getTime()) / (1000 * 60 * 60);

        if (totalHours + newHours > POLICIES.MAX_ROOM_HOURS_PER_MONTH) {
            return {
                allowed: false,
                reason: `Monthly room limit exceeded. You have used ${totalHours.toFixed(1)} hours out of ${POLICIES.MAX_ROOM_HOURS_PER_MONTH} hours this month.`,
            };
        }
    } else if (booking.kind === 'EQUIPMENT') {
        const equipmentBookings = monthlyBookings.filter((b) => b.kind === 'EQUIPMENT');
        if (equipmentBookings.length >= POLICIES.MAX_EQUIPMENT_BORROWS_PER_MONTH) {
            return {
                allowed: false,
                reason: `Monthly equipment limit exceeded. You can only borrow equipment ${POLICIES.MAX_EQUIPMENT_BORROWS_PER_MONTH} times per month.`,
            };
        }
    }

    // Check consecutive bookings
    const upcomingBookings = await db
        .select()
        .from(bookings)
        .where(
            and(
                eq(bookings.userId, user.id),
                ne(bookings.id, booking.id),
                ne(bookings.kind, 'LIBRARY'),
                inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
                gt(bookings.endAt, new Date())
            )
        );

    const sameResourceBookings = upcomingBookings.filter(
        (b) => b.resourceId === booking.resourceId
    );

    if (
        hasConsecutiveBookings(
            sameResourceBookings.map((b) => ({
                start: b.startAt,
                end: b.endAt,
                resourceId: b.resourceId,
            })),
            newStart,
            newEnd,
            booking.resourceId
        )
    ) {
        return {
            allowed: false,
            reason: `You can only book ${POLICIES.MAX_CONSECUTIVE_SLOTS} consecutive slots for the same resource.`,
        };
    }

    const rules = resource.rules as ResourceRules || {};
    const requiresApproval = booking.kind === 'LIBRARY' ? false : (rules.requiresApproval || false);

    return {
        allowed: true,
        requiresApproval,
    };
}
