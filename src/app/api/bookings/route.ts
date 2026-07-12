import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
const db = getDb();
import { bookings, resources, users, approvalTokens, blocks, equipmentItems } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray, desc, not } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/guards';
import {
  POLICIES,
  canUserBook,
  isWithinAdvanceWindow,
  loadDynamicPolicies,
} from '@/lib/policies';
import { sendEmail, generateApprovalEmailHTML, getApprovalEmailRecipients } from '@/lib/email';
import { formatDateTime } from '@/lib/utils';
import { bookingSchema } from '@/lib/validations/booking';
import { handleApiError, ValidationError, NotFoundError, ConflictError } from '@/lib/errors';
import { toIST } from '@/lib/timezone';
import { canUserCreateBookingWithCaps } from '@/lib/bookingRules';
import { canBorrowSportCategory } from '@/lib/sportCategoryRules';
import { countActiveGroupParticipations, getGroupParticipantBookings } from '@/lib/groupBookingParticipation';
import { checkBookingAvailability } from '@/lib/inventory';
import { triggerLazyExpiration } from '@/lib/lazyExpiration';
import { withRateLimit } from '@/lib/ratelimit';
import crypto from 'crypto';

function generateApprovalToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function sendApprovalNotifications(options: {
  bookingId: number;
  bookingBorrowReason: string | null;
  resource: { name: string; type: string };
  user: { name: string | null; email: string };
  startDate: Date;
  endDate: Date;
}) {
  const { bookingId, bookingBorrowReason, resource, user, startDate, endDate } = options;

  const adminEmails = await getApprovalEmailRecipients(resource.type);
  if (adminEmails.length === 0) {
    return;
  }

  const approveToken = generateApprovalToken();
  const rejectToken = generateApprovalToken();

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const expiresAt = new Date(Math.min(sevenDaysFromNow.getTime(), startDate.getTime()));

  await db.insert(approvalTokens).values([
    {
      bookingId,
      token: approveToken,
      action: 'approve',
      expiresAt,
    },
    {
      bookingId,
      token: rejectToken,
      action: 'reject',
      expiresAt,
    },
  ]);

  try {
    const emailHTML = generateApprovalEmailHTML(
      String(bookingId),
      resource.name,
      user.name || user.email.split('@')[0],
      user.email,
      formatDateTime(startDate),
      formatDateTime(endDate),
      approveToken,
      rejectToken,
      bookingBorrowReason || undefined
    );

    await sendEmail({
      to: adminEmails,
      subject: `Booking Approval Required: ${resource.name}`,
      html: emailHTML,
    });

    await db
      .update(bookings)
      .set({
        approvalEmailSent: true,
        approvalEmailSentAt: new Date(),
        approvalEmailError: null,
      })
      .where(eq(bookings.id, bookingId));
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError);
    try {
      await db
        .update(bookings)
        .set({
          approvalEmailSent: false,
          approvalEmailError: emailError instanceof Error ? emailError.message : String(emailError),
        })
        .where(eq(bookings.id, bookingId));
    } catch (updateError) {
      console.error('Failed to record email error:', updateError);
    }
  }

  try {
    const { sendApprovalRequestSlackNotification } = await import('@/lib/slack');
    await sendApprovalRequestSlackNotification({
      bookingId: String(bookingId),
      resourceName: resource.name,
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      startTime: formatDateTime(startDate),
      endTime: formatDateTime(endDate),
      approveToken,
      rejectToken,
      borrowReason: bookingBorrowReason,
    });
  } catch (slackError) {
    console.error('Failed to send Slack notification:', slackError);
  }
}

async function getHandler(req: NextRequest) {
  try {
    triggerLazyExpiration();

    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const me = searchParams.get('me') === 'true';
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions: any[] = [];

    if (me) {
      conditions.push(eq(bookings.userId, user.id));
    } else if (userId) {
      if (user.role !== 'ADMIN') {
        conditions.push(eq(bookings.userId, user.id));
      } else {
        conditions.push(eq(bookings.userId, Number(userId)));
      }
    }

    if (status) {
      conditions.push(eq(bookings.status, status));
    }

    if (from) {
      conditions.push(gte(bookings.startAt, new Date(from)));
    }
    if (to) {
      conditions.push(lte(bookings.startAt, new Date(to)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allBookings = await db
      .select()
      .from(bookings)
      .where(whereClause)
      .orderBy(desc(bookings.startAt))
      .limit(100);

    if (me && !status && !from && !to) {
      const participantBookings = await getGroupParticipantBookings(user.id, {
        requireConfirmedMembership: true,
        excludeOrganizerOwnedBookings: true,
      });

      const existingIds = new Set(allBookings.map((b) => b.id));
      const missingIds = participantBookings
        .filter((pb) => !existingIds.has(pb.id))
        .map((pb) => pb.id);

      if (missingIds.length > 0) {
        const missingBookings = await db
          .select()
          .from(bookings)
          .where(inArray(bookings.id, missingIds));
        allBookings.push(...missingBookings);
      }

      allBookings.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    }

    const resourceIds = [...new Set(allBookings.map((b) => b.resourceId))];
    const userIds = [...new Set(allBookings.map((b) => b.userId))];

    const [resourcesList, usersList] = await Promise.all([
      resourceIds.length > 0
        ? db
            .select({ id: resources.id, name: resources.name, type: resources.type })
            .from(resources)
            .where(inArray(resources.id, resourceIds))
        : [],
      userIds.length > 0
        ? db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(inArray(users.id, userIds))
        : [],
    ]);

    const resourceMap = new Map<number, any>(resourcesList.map((r: any) => [r.id, r]));
    const userMap = new Map<number, any>(usersList.map((u: any) => [u.id, u]));

    const enrichedBookings = allBookings.map((b: any) => {
      const userData = userMap.get(b.userId);
      return {
        ...b,
        _id: b.id, // Compatibility
        resourceName: resourceMap.get(b.resourceId)?.name || 'Unknown',
        userEmail: userData?.email || null,
        userName: userData?.name || null,
      };
    });

    return NextResponse.json({ bookings: enrichedBookings });
  } catch (error) {
    return handleApiError(error);
  }
}

async function postHandler(req: Request) {
  try {
    const authUser = await requireAuth();
    const body = await req.json();

    const validationResult = bookingSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError('Validation failed: ' + JSON.stringify(validationResult.error.flatten()));
    }

    const { resourceId, start, end, items, borrowReason } = validationResult.data;
    const userId = authUser.id;

    const [dynamicPolicies, userList, resourceList] = await Promise.all([
      loadDynamicPolicies([
        'WORKING_HOURS_START',
        'WORKING_HOURS_END',
        'MIN_BOOKING_DURATION_MINUTES',
        'MAX_BOOKING_DURATION_MINUTES',
        'MAX_ACTIVE_FACILITIES',
        'MAX_ACTIVE_ROOMS',
        'MAX_TOTAL_ACTIVE_BOOKINGS',
        'ADVANCE_BOOKING_DAYS',
        'NO_SHOW_GRACE_MINUTES',
        'MAX_FACILITY_BOOKINGS_PER_DAY',
        'MAX_ROOM_BOOKINGS_PER_DAY',
        'MAX_EQUIPMENT_BOOKINGS_PER_DAY',
        'MAX_FACILITY_HOURS_PER_MONTH',
        'MAX_ROOM_HOURS_PER_MONTH',
        'MAX_EQUIPMENT_BORROWS_PER_MONTH',
      ]),
      db.select().from(users).where(eq(users.id, userId)).limit(1),
      db.select().from(resources).where(eq(resources.id, resourceId)).limit(1),
    ]);

    const user = userList[0];
    const resource = resourceList[0];

    const startDate = new Date(start);
    const endDate = new Date(end);

    const GRACE_PERIOD_MS = 2 * 60 * 1000;
    const nowWithGrace = new Date(Date.now() - GRACE_PERIOD_MS);

    if (startDate < nowWithGrace) {
      throw new ValidationError('Cannot book in the past');
    }

    const startIST = toIST(startDate);
    const endIST = toIST(endDate);
    const startHour = startIST.getHours();
    const endHour = endIST.getHours();
    const endMinutes = endIST.getMinutes();

    if (startHour < dynamicPolicies.WORKING_HOURS_START) {
      throw new ValidationError(`Bookings cannot start before ${dynamicPolicies.WORKING_HOURS_START}:00 AM`);
    }

    if (endHour > dynamicPolicies.WORKING_HOURS_END || (endHour === dynamicPolicies.WORKING_HOURS_END && endMinutes > 0)) {
      throw new ValidationError(`Bookings cannot end after ${dynamicPolicies.WORKING_HOURS_END % 12 || 12}:00 PM`);
    }

    if (!user) throw new NotFoundError('User');

    const canBook = canUserBook(user);
    if (!canBook.allowed) {
      throw new ValidationError(canBook.reason || 'Booking not allowed');
    }

    if (!resource || resource.status !== 'ACTIVE') {
      throw new NotFoundError('Resource');
    }

    const operatingHours = resource.operatingHours as any;
    if (operatingHours?.useCustom && operatingHours.schedule) {
      const dayOfWeek = startIST.getDay();
      const daySchedule = operatingHours.schedule[dayOfWeek];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      if (!daySchedule.open) {
        throw new ValidationError(`${resource.name} is closed on ${dayNames[dayOfWeek]}s`);
      }

      if (startHour < daySchedule.startHour) {
        throw new ValidationError(`${resource.name} opens at ${daySchedule.startHour}:00 on ${dayNames[dayOfWeek]}s`);
      }

      if (endHour > daySchedule.endHour || (endHour === daySchedule.endHour && endMinutes > 0)) {
        throw new ValidationError(`${resource.name} closes at ${daySchedule.endHour}:00 on ${dayNames[dayOfWeek]}s`);
      }
    }

    let kind: 'FACILITY' | 'ROOM' | 'EQUIPMENT' | 'LIBRARY';
    if (resource.type === 'LAB_EQUIPMENT' || resource.type === 'SPORTS_EQUIPMENT') {
      kind = 'EQUIPMENT';
    } else {
      kind = (resource.type || 'FACILITY') as 'FACILITY' | 'ROOM' | 'EQUIPMENT' | 'LIBRARY';
    }

    if (kind !== 'EQUIPMENT' && !isWithinAdvanceWindow(startDate)) {
      throw new ValidationError(`Bookings can only be made up to ${dynamicPolicies.ADVANCE_BOOKING_DAYS} days in advance`);
    }

    if (kind === 'ROOM' || kind === 'FACILITY') {
      const minimumLeadMs = POLICIES.ROOM_BOOKING_MIN_LEAD_MINUTES * 60 * 1000;
      if (startDate.getTime() - Date.now() < minimumLeadMs) {
        const label = kind === 'ROOM' ? 'Rooms' : 'Facilities';
        throw new ValidationError(
          `${label} must be booked at least ${POLICIES.ROOM_BOOKING_MIN_LEAD_MINUTES} minutes before the start time`
        );
      }
    }

    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

    if (kind === 'FACILITY' || kind === 'ROOM') {
      if (durationMinutes < dynamicPolicies.MIN_BOOKING_DURATION_MINUTES) {
        throw new ValidationError(`Booking duration must be at least ${dynamicPolicies.MIN_BOOKING_DURATION_MINUTES} minutes`);
      }
      if (durationMinutes > dynamicPolicies.MAX_BOOKING_DURATION_MINUTES) {
        throw new ValidationError(`Booking duration cannot exceed ${dynamicPolicies.MAX_BOOKING_DURATION_MINUTES} minutes`);
      }
    }

    const rules = resource.rules as any || {};
    if (rules.studentsOnly && user.role !== 'STUDENT') {
      throw new ValidationError('This resource is only available to students');
    }

    const [activeFacilitiesResult, activeRoomsResult, personalActiveBookingsResult, groupActiveBookings] = await Promise.all([
      kind === 'FACILITY'
        ? db
            .select()
            .from(bookings)
            .where(
              and(
                eq(bookings.userId, user.id),
                eq(bookings.kind, 'FACILITY'),
                inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
                gte(bookings.endAt, new Date())
              )
            )
        : Promise.resolve([]),
      kind === 'ROOM'
        ? db
            .select()
            .from(bookings)
            .where(
              and(
                eq(bookings.userId, user.id),
                eq(bookings.kind, 'ROOM'),
                inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
                gte(bookings.endAt, new Date())
              )
            )
        : Promise.resolve([]),
      db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.userId, user.id),
            inArray(bookings.kind, ['FACILITY', 'ROOM']),
            inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN', 'PENDING']),
            gte(bookings.endAt, new Date())
          )
        ),
      countActiveGroupParticipations(user.id, {
        excludeOrganizerOwnedBookings: true,
      }),
    ]);

    const activeFacilities = activeFacilitiesResult.length;
    const activeRooms = activeRoomsResult.length;
    const personalActiveBookings = personalActiveBookingsResult.length;

    if (kind === 'FACILITY' && activeFacilities >= dynamicPolicies.MAX_ACTIVE_FACILITIES) {
      throw new ValidationError(`You can only have ${dynamicPolicies.MAX_ACTIVE_FACILITIES} active facility bookings at a time`);
    }

    if (kind === 'ROOM' && activeRooms >= dynamicPolicies.MAX_ACTIVE_ROOMS) {
      throw new ValidationError(`You can only have ${dynamicPolicies.MAX_ACTIVE_ROOMS} active room bookings at a time`);
    }

    const totalActiveBookings = personalActiveBookings + groupActiveBookings;
    if (totalActiveBookings >= dynamicPolicies.MAX_TOTAL_ACTIVE_BOOKINGS) {
      throw new ValidationError(`You can only have ${dynamicPolicies.MAX_TOTAL_ACTIVE_BOOKINGS} active facility/room bookings at a time`);
    }

    const [capsCheck, conflictingBlockList] = await Promise.all([
      canUserCreateBookingWithCaps({
        userId: user.id,
        kind,
        start: startDate,
        end: endDate,
      }),
      db
        .select()
        .from(blocks)
        .where(
          and(
            eq(blocks.resourceId, resourceId),
            lte(blocks.startAt, endDate),
            gte(blocks.endAt, startDate)
          )
        )
        .limit(1),
    ]);

    if (!capsCheck.allowed) {
      throw new ValidationError(capsCheck.reason || 'Booking limits exceeded');
    }

    const conflictingBlock = conflictingBlockList[0];
    if (conflictingBlock) {
      throw new ConflictError(`Resource is blocked: ${conflictingBlock.reason}`);
    }

    if (kind === 'FACILITY' || kind === 'ROOM') {
      const conflictingBookingList = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.resourceId, resourceId),
            inArray(bookings.status, ['CONFIRMED', 'PENDING']),
            lte(bookings.startAt, endDate),
            gte(bookings.endAt, startDate)
          )
        )
        .limit(1);

      if (conflictingBookingList[0]) {
        throw new ConflictError('Time slot already booked');
      }

      if (resource.sharedGroupId) {
        const sharedResources = await db
          .select()
          .from(resources)
          .where(
            and(
              eq(resources.sharedGroupId, resource.sharedGroupId),
              not(eq(resources.id, resourceId))
            )
          );

        const sharedResourceIds = sharedResources.map((r) => r.id);

        if (sharedResourceIds.length > 0) {
          const sharedConflictList = await db
            .select()
            .from(bookings)
            .where(
              and(
                inArray(bookings.resourceId, sharedResourceIds),
                inArray(bookings.status, ['CONFIRMED', 'PENDING']),
                lte(bookings.startAt, endDate),
                gte(bookings.endAt, startDate)
              )
            )
            .limit(1);

          const sharedConflict = sharedConflictList[0];
          if (sharedConflict) {
            const conflictResource = sharedResources.find((r) => r.id === sharedConflict.resourceId);
            throw new ConflictError(`Cannot book: ${conflictResource?.name} is booked during this time (shared turf rule)`);
          }
        }
      }
    }

    let enrichedItems: any[] | undefined;
    let equipmentItemsById = new Map<number, any>();

    if (kind === 'EQUIPMENT') {
      if (!items || items.length === 0) {
        throw new ValidationError('Items are required for equipment bookings');
      }

      const itemIds = items.map((i) => Number(i.itemId));
      const uniqueItemIds = new Set(itemIds);
      if (uniqueItemIds.size !== itemIds.length) {
        throw new ValidationError('Duplicate items detected');
      }

      const eqItemsList = await db
        .select({
          id: equipmentItems.id,
          name: equipmentItems.name,
          qtyTotal: equipmentItems.qtyTotal,
          requiresApproval: equipmentItems.requiresApproval,
        })
        .from(equipmentItems)
        .where(inArray(equipmentItems.id, [...uniqueItemIds]));

      if (eqItemsList.length !== uniqueItemIds.size) {
        throw new NotFoundError('Equipment item');
      }

      equipmentItemsById = new Map<number, any>(eqItemsList.map((item: any) => [item.id, item]));

      const itemsToCheck = items.map((item) => {
        const currentItem = equipmentItemsById.get(Number(item.itemId));
        if (!currentItem) {
          throw new NotFoundError('Equipment item');
        }

        return {
          itemId: String(item.itemId),
          qty: item.qty,
          totalQty: currentItem.qtyTotal,
          name: currentItem.name,
        };
      });

      const [availabilityCheck, sportCategoryCheck] = await Promise.all([
        checkBookingAvailability(itemsToCheck, startDate, endDate),
        resource.type === 'SPORTS_EQUIPMENT'
          ? canBorrowSportCategory({
              userId: user.id,
              requestedItemIds: itemIds,
              start: startDate,
              end: endDate,
            })
          : { allowed: true },
      ]);

      if (!availabilityCheck.success) {
        throw new ConflictError(availabilityCheck.message || 'Items not available');
      }

      if (!sportCategoryCheck.allowed) {
        throw new ValidationError(
          (sportCategoryCheck as { reason?: string }).reason || 'Sport category conflict'
        );
      }

      enrichedItems = items.map((item) => {
        const currentItem = equipmentItemsById.get(Number(item.itemId));
        if (!currentItem) {
          throw new NotFoundError('Equipment item');
        }

        return {
          itemId: Number(item.itemId),
          name: currentItem.name,
          qty: item.qty,
        };
      });
    }

    let requiresApproval = false;
    requiresApproval = rules.requiresApproval || false;

    if (kind === 'EQUIPMENT' && !requiresApproval && items && items.length > 0) {
      if ([...equipmentItemsById.values()].some((item) => item.requiresApproval)) {
        requiresApproval = true;
      }
    }

    if (requiresApproval && (!borrowReason || borrowReason.trim().length === 0)) {
      throw new ValidationError('Please provide a reason for borrowing this equipment');
    }

    const insertedList = await db
      .insert(bookings)
      .values({
        userId: user.id,
        resourceId,
        kind,
        items: enrichedItems,
        startAt: startDate,
        endAt: endDate,
        status: requiresApproval ? 'PENDING' : 'CONFIRMED',
        requiresApproval,
        approval: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
        qrIssued: false,
        borrowReason: borrowReason?.trim().substring(0, 500) || null,
      })
      .returning();

    const booking = insertedList[0];

    if (requiresApproval) {
      await sendApprovalNotifications({
        bookingId: booking.id,
        bookingBorrowReason: booking.borrowReason,
        resource: {
          name: resource.name,
          type: resource.type || 'FACILITY',
        },
        user: {
          name: user.name,
          email: user.email,
        },
        startDate,
        endDate,
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withRateLimit(getHandler, 30, 60000);
export const POST = withRateLimit(postHandler);
