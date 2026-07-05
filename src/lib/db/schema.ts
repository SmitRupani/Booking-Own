import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

// ============== ENUM-LIKE FIELDS (CHECK CONSTRAINTS / TYPE CONSTS) ==============
// To keep database operations flexible, enums are represented as text fields in tables
// with validation constraints at the application layer (Zod).

// 1. Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').unique(), // clerkId is optional/nullable in legacy but used for SSO
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').default('STUDENT').notNull(), // 'STUDENT' | 'ADMIN' | 'GUARD'
  image: text('image'),
  password: text('password'), // Bcrypt hash for guards only
  penaltyPoints: integer('penalty_points').default(0).notNull(),
  suspendedUntil: timestamp('suspended_until'),
  suspensionLevel: integer('suspension_level').default(0).notNull(),
  blocked: boolean('blocked').default(false).notNull(),
  blockedAt: timestamp('blocked_at'),
  blockedBy: text('blocked_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Resources Table
export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull().default('general'), // 'facility' | 'room' | 'equipment' | 'library' (target specific compatibility)
  type: text('type'), // 'FACILITY' | 'ROOM' | 'LAB_EQUIPMENT' | 'SPORTS_EQUIPMENT' | 'LIBRARY' (legacy enum compatibility)
  location: text('location'),
  capacity: integer('capacity').default(1).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  rules: jsonb('rules').default({}).notNull(), // { requiresApproval, slotMinutes, studentsOnly }
  sharedGroupId: text('shared_group_id'),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'INACTIVE'
  operatingHours: jsonb('operating_hours'), // { useCustom, schedule: [...] }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Equipment Items Table
export const equipmentItems = pgTable('equipment_items', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  qtyTotal: integer('qty_total').notNull(),
  qtyAvailable: integer('qty_available').notNull(),
  qtyReserved: integer('qty_reserved').default(0).notNull(), // Deprecated but kept for legacy scripts
  imageUrl: text('image_url'),
  safety: boolean('safety').default(false).notNull(),
  restricted: boolean('restricted').default(false).notNull(),
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  sportCategory: text('sport_category'), // e.g. 'BADMINTON', 'CRICKET'
  labCategory: text('lab_category'), // 'LAPTOP' | 'SAME_DAY_RETURN' | 'GENERAL'
  isbn: text('isbn'), // Library specific (Legacy-2/SSTBORROWING)
  author: text('author'), // Library specific (Legacy-2/SSTBORROWING)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Bookings Table
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // 'FACILITY' | 'ROOM' | 'EQUIPMENT' | 'LIBRARY'
  items: jsonb('items'), // [{ itemId, name, qty, damaged, damageNotes }]
  startAt: timestamp('start_at').notNull(), // maps to legacy 'start'
  endAt: timestamp('end_at').notNull(), // maps to legacy 'end'
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RETURNED'
  requiresApproval: boolean('requires_approval').default(false).notNull(),
  approval: text('approval').default('NOT_REQUIRED').notNull(), // 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  qrCode: text('qr_code'),
  qrIssued: boolean('qr_issued').default(false).notNull(),
  isGroupBooking: boolean('is_group_booking').default(false).notNull(),
  groupBookingId: text('group_booking_id'),
  checkedInAt: timestamp('checked_in_at'),
  returnedAt: timestamp('returned_at'),
  returnCondition: text('return_condition'), // 'excellent' | 'good' | 'fair' | 'damaged'
  returnNotes: text('return_notes'),
  returnedBy: text('returned_by'), // Guard ID/Username
  approvalEmailSent: boolean('approval_email_sent').default(false).notNull(),
  approvalEmailSentAt: timestamp('approval_email_sent_at'),
  approvalEmailError: text('approval_email_error'),
  rejectionReason: text('rejection_reason'),
  borrowReason: text('borrow_reason'),
  rescheduleCount: integer('reschedule_count').default(0).notNull(),
  extensionCount: integer('extension_count').default(0).notNull(),
  rescheduleHistory: jsonb('reschedule_history').default([]), // [{ oldStart, oldEnd, newStart, newEnd, rescheduledAt, rescheduledBy, reason }]
  overrideBy: text('override_by'),
  overrideAt: timestamp('override_at'),
  overrideReason: text('override_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Blocks Table (Admin closed/maintenance times)
export const blocks = pgTable('blocks', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  startAt: timestamp('start_at').notNull(), // maps to legacy 'start'
  endAt: timestamp('end_at').notNull(), // maps to legacy 'end'
  reason: text('reason').notNull(),
  type: text('type').default('MAINTENANCE').notNull(), // 'EVENT' | 'MAINTENANCE'
  createdBy: integer('created_by').references(() => users.id),
  recurringGroupId: text('recurring_group_id'),
  recurringPattern: text('recurring_pattern'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Group Bookings Table
export const groupBookings = pgTable('group_bookings', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }).unique(),
  organizerId: integer('organizer_id').notNull().references(() => users.id),
  organizerEmail: text('organizer_email').notNull(),
  members: jsonb('members').notNull(), // [{ userId, email, name, status, invitedAt, respondedAt, emailSent, emailSentAt, emailError }]
  requiredMinimum: integer('required_minimum').default(6).notNull(),
  confirmedCount: integer('confirmed_count').default(1).notNull(),
  status: text('status').default('PENDING_CONFIRMATIONS').notNull(), // 'PENDING_CONFIRMATIONS' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. Penalties Table
export const penalties = pgTable('penalties', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
  points: integer('points').notNull(),
  reason: text('reason').notNull(),
  waivedBy: text('waived_by'),
  waivedAt: timestamp('waived_at'),
  served: boolean('served').default(false).notNull(),
  servedAt: timestamp('served_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. QR Tokens Table
export const qrTokens = pgTable('qr_tokens', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Approval Tokens Table
export const approvalTokens = pgTable('approval_tokens', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  action: text('action').notNull(), // 'approve' | 'reject'
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  action: text('action').notNull(),
  actorId: integer('actor_id'), // target specific compatibility
  actorName: text('actor_name'), // target specific compatibility
  targetType: text('target_type'), // target specific compatibility
  targetId: integer('target_id'), // target specific compatibility
  message: text('message'), // target specific compatibility
  actor: jsonb('actor'), // legacy compatibility { userId, email, name }
  target: jsonb('target'), // legacy compatibility { type, id, name }
  details: jsonb('details').default({}).notNull(),
  metadata: jsonb('metadata'), // { ipAddress, userAgent }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Cancellations Table
export const cancellations = pgTable('cancellations', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }).unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  resourceName: text('resource_name').notNull(),
  bookingStart: timestamp('booking_start').notNull(),
  cancelledAt: timestamp('cancelled_at').notNull(),
  wasLate: boolean('was_late').default(false).notNull(),
  penaltyApplied: integer('penalty_applied').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Email Routing Table
export const emailRouting = pgTable('email_routing', {
  id: serial('id').primaryKey(),
  category: text('category').notNull().unique(), // 'LAB_EQUIPMENT' | 'SPORTS_EQUIPMENT' | 'FACILITY' | 'ROOM' | 'LIBRARY' | 'DEFAULT'
  emails: jsonb('emails').notNull(), // String[] of emails
  enabled: boolean('enabled').default(true).notNull(),
  updatedBy: text('updated_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 13. System Config Table
export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: integer('value').notNull(),
  description: text('description'),
  category: text('category').default('general').notNull(), // 'limits' | 'durations' | ...
  updatedBy: text('updated_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
