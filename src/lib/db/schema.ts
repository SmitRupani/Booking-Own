// Example Drizzle schema for core domain tables.
// Expand these definitions to match the full domain model from the brief.
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: text('clerk_id').notNull(),
  name: text('name'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  capacity: integer('capacity').default(1).notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull(),
  userId: integer('user_id').notNull(),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const blocks = pgTable('blocks', {
  id: serial('id').primaryKey(),
  resourceId: integer('resource_id').notNull(),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  reason: text('reason'),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
