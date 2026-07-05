import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { 
  users, 
  resources, 
  equipmentItems, 
  bookings, 
  blocks, 
  groupBookings, 
  penalties, 
  qrTokens, 
  approvalTokens, 
  auditLogs, 
  cancellations, 
  emailRouting, 
  systemConfig 
} from './schema';

// 1. Users
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// 2. Resources
export const insertResourceSchema = createInsertSchema(resources);
export const selectResourceSchema = createSelectSchema(resources);

// 3. Equipment Items
export const insertEquipmentItemSchema = createInsertSchema(equipmentItems);
export const selectEquipmentItemSchema = createSelectSchema(equipmentItems);

// 4. Bookings
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);

// 5. Blocks
export const insertBlockSchema = createInsertSchema(blocks);
export const selectBlockSchema = createSelectSchema(blocks);

// 6. Group Bookings
export const insertGroupBookingSchema = createInsertSchema(groupBookings);
export const selectGroupBookingSchema = createSelectSchema(groupBookings);

// 7. Penalties
export const insertPenaltySchema = createInsertSchema(penalties);
export const selectPenaltySchema = createSelectSchema(penalties);

// 8. QR Tokens
export const insertQRTokenSchema = createInsertSchema(qrTokens);
export const selectQRTokenSchema = createSelectSchema(qrTokens);

// 9. Approval Tokens
export const insertApprovalTokenSchema = createInsertSchema(approvalTokens);
export const selectApprovalTokenSchema = createSelectSchema(approvalTokens);

// 10. Audit Logs
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);

// 11. Cancellations
export const insertCancellationSchema = createInsertSchema(cancellations);
export const selectCancellationSchema = createSelectSchema(cancellations);

// 12. Email Routing
export const insertEmailRoutingSchema = createInsertSchema(emailRouting);
export const selectEmailRoutingSchema = createSelectSchema(emailRouting);

// 13. System Config
export const insertSystemConfigSchema = createInsertSchema(systemConfig);
export const selectSystemConfigSchema = createSelectSchema(systemConfig);
