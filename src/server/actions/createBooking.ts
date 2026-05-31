"use server";
import { createBookingSchema, CreateBooking } from '../../lib/validations/booking';
import { createBooking } from '../services/bookingService';

export async function createBookingAction(input: unknown) {
  const parsed = createBookingSchema.parse(input) as CreateBooking;

  const domain = {
    resourceId: parsed.resourceId,
    userId: 0, // TODO: wire Clerk user id / server session here
    startAt: new Date(parsed.startAt),
    endAt: new Date(parsed.endAt),
  };

  return await createBooking(domain);
}
