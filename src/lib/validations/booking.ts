import { z } from 'zod';

const resourceIdSchema = z.union([
  z.number().int().positive(),
  z.string().min(1).transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) throw new Error('Invalid resourceId');
    return parsed;
  }),
]);

const isoDateStringSchema = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'Invalid ISO date string',
});

export const createBookingSchema = z.object({
  resourceId: resourceIdSchema,
  startAt: isoDateStringSchema,
  endAt: isoDateStringSchema,
  participants: z.array(z.number().int()).optional(),
});

export const bookingSchema = z
  .object({
    resourceId: resourceIdSchema,
    kind: z.enum(['FACILITY', 'ROOM', 'EQUIPMENT', 'LIBRARY']).optional(),
    start: isoDateStringSchema,
    end: isoDateStringSchema,
    items: z
      .array(
        z.object({
          itemId: z.union([
            z.number().int().positive(),
            z.string().min(1).transform((val) => {
              const parsed = parseInt(val, 10);
              if (isNaN(parsed)) throw new Error('Invalid itemId');
              return parsed;
            }),
          ]),
          name: z.string().optional(),
          qty: z.number().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
        })
      )
      .min(1, 'At least one item is required')
      .optional(),
    borrowReason: z.string().optional().nullable(),
    isGroupBooking: z.boolean().optional(),
    invitedEmails: z.array(z.string().email('Invalid email')).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['end'],
    }
  );

export const groupBookingSchema = z
  .object({
    resourceId: resourceIdSchema,
    start: isoDateStringSchema,
    end: isoDateStringSchema,
    memberEmails: z.array(z.string().email('Invalid email address')).min(1, 'At least one member is required'),
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['end'],
    }
  );

export const rescheduleSchema = z
  .object({
    start: isoDateStringSchema,
    end: isoDateStringSchema,
  })
  .refine(
    (data) => {
      const start = new Date(data.start);
      const end = new Date(data.end);
      return end > start;
    },
    {
      message: 'End time must be after start time',
      path: ['end'],
    }
  );

export type CreateBooking = z.infer<typeof createBookingSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
