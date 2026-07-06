import { and, eq, gte, lt, gt, inArray, ne, sql, or } from 'drizzle-orm';
import { getDb } from './db/client';
import { groupBookings, bookings } from './db/schema';

// Interface for group member stored as JSON
interface GroupMember {
  userId: number;
  email: string;
  name: string;
  status: string;
  invitedAt: string;
  respondedAt?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  emailError?: string;
}

type ParticipationFilterOptions = {
  excludeGroupBookingId?: number;
  requireConfirmedMembership?: boolean;
  excludeOrganizerOwnedBookings?: boolean;
  overlapStart?: Date;
  overlapEnd?: Date;
  bookingStartGte?: Date;
  bookingStartLt?: Date;
  bookingEndGt?: Date;
  bookingKinds?: string[];
  bookingStatuses?: string[];
};

const ACTIVE_GROUP_STATUSES = ['PENDING_CONFIRMATIONS', 'CONFIRMED'];
const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'];

type GroupParticipantBooking = {
  id: number;
  start: Date;
  end: Date;
  kind: string;
  status: string;
};

export async function getGroupParticipantBookingsForUsers(
  userIds: number[],
  options: ParticipationFilterOptions = {}
): Promise<Map<number, GroupParticipantBooking[]>> {
  const uniqueUserIds = [...new Set(userIds)];
  const bookingsByUser = new Map<number, GroupParticipantBooking[]>(
    uniqueUserIds.map((userId) => [userId, [] as GroupParticipantBooking[]])
  );

  if (uniqueUserIds.length === 0) {
    return bookingsByUser;
  }

  const db = getDb();

  // We fetch active group bookings.
  // To keep it simple and robust, we can query active group bookings and filter user participation in JS,
  // or use JSONB array queries. Let's filter in JS to ensure 100% database engine compatibility and safety.
  // First, we find all active group bookings (status PENDING_CONFIRMATIONS or CONFIRMED)
  // that relate to these bookings filters.
  let bookingConditions = [];

  const kinds = options.bookingKinds ?? ['FACILITY', 'ROOM'];
  bookingConditions.push(inArray(bookings.kind, kinds));

  const statuses = options.bookingStatuses ?? ACTIVE_BOOKING_STATUSES;
  bookingConditions.push(inArray(bookings.status, statuses));

  if (options.overlapStart) {
    bookingConditions.push(gt(bookings.endAt, options.overlapStart));
  }
  if (options.overlapEnd) {
    bookingConditions.push(lt(bookings.startAt, options.overlapEnd));
  }
  if (options.bookingStartGte) {
    bookingConditions.push(gte(bookings.startAt, options.bookingStartGte));
  }
  if (options.bookingStartLt) {
    bookingConditions.push(lt(bookings.startAt, options.bookingStartLt));
  }
  if (options.bookingEndGt) {
    bookingConditions.push(gt(bookings.endAt, options.bookingEndGt));
  }

  let groupConditions = [
    inArray(groupBookings.status, ACTIVE_GROUP_STATUSES)
  ];

  if (options.excludeGroupBookingId) {
    groupConditions.push(ne(groupBookings.id, options.excludeGroupBookingId));
  }

  // Join group bookings with bookings to apply booking filters
  const results = await db
    .select({
      groupBookingId: groupBookings.id,
      organizerId: groupBookings.organizerId,
      members: groupBookings.members,
      bookingId: bookings.id,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      kind: bookings.kind,
      status: bookings.status,
    })
    .from(groupBookings)
    .innerJoin(bookings, eq(groupBookings.bookingId, bookings.id))
    .where(and(...groupConditions, ...bookingConditions));

  const requestedUsers = new Set(uniqueUserIds);

  for (const row of results) {
    const members = (row.members as GroupMember[] | null) ?? [];
    const booking: GroupParticipantBooking = {
      id: row.bookingId,
      start: row.startAt,
      end: row.endAt,
      kind: row.kind,
      status: row.status,
    };

    const seenForBooking = new Set<number>();

    const addBookingForUser = (userId: number) => {
      if (!requestedUsers.has(userId) || seenForBooking.has(userId)) {
        return;
      }

      seenForBooking.add(userId);
      bookingsByUser.get(userId)?.push(booking);
    };

    if (!options.excludeOrganizerOwnedBookings) {
      addBookingForUser(row.organizerId);
    }

    for (const member of members) {
      if (options.requireConfirmedMembership && member.status !== 'CONFIRMED') {
        continue;
      }
      addBookingForUser(Number(member.userId));
    }
  }

  return bookingsByUser;
}

/**
 * Fetch group booking host bookings that a user is participating in
 * (as an invited member OR as the organizer).
 */
export async function getGroupParticipantBookings(
  userId: string | number,
  session?: any, // kept for signature compatibility with legacy-2
  options: ParticipationFilterOptions = {}
) {
  // If session is passed as options (legacy argument shift check)
  let opt = options;
  if (session && typeof session === 'object' && !('client' in session) && !('transaction' in session)) {
    opt = session;
  }

  const uId = Number(userId);
  const bookingsByUser = await getGroupParticipantBookingsForUsers([uId], opt);
  return bookingsByUser.get(uId) ?? [];
}

/**
 * Count active (future-ending) group bookings a user is part of.
 */
export async function countActiveGroupParticipations(
  userId: string | number,
  session?: any,
  options: ParticipationFilterOptions = {}
): Promise<number> {
  let opt = options;
  if (session && typeof session === 'object' && !('client' in session) && !('transaction' in session)) {
    opt = session;
  }

  const bookings = await getGroupParticipantBookings(
    userId,
    undefined,
    {
      ...opt,
      bookingEndGt: new Date(),
    }
  );
  return bookings.length;
}
