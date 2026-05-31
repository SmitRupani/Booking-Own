import { z } from 'zod';

export const createBookingSchema = z.object({
  resourceId: z.number().int().positive(),
  startAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: 'Invalid startAt ISO date string',
  }),
  endAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
    message: 'Invalid endAt ISO date string',
  }),
  participants: z.array(z.number().int()).optional(),
});

export type CreateBooking = z.infer<typeof createBookingSchema>;
