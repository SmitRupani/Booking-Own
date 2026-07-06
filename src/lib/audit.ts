import { getDb } from './db/client';
import { auditLogs } from './db/schema';

export type AuditTargetType = 'BOOKING' | 'RESOURCE' | 'USER' | 'BLOCK' | 'PENALTY' | 'SETTINGS' | 'EMAIL_ROUTING';

export type AuditAction = string;

export interface AuditEventParams {
    action: AuditAction;
    actor: {
        userId: string | number;
        email: string;
        name: string;
    };
    target?: {
        type: AuditTargetType;
        id: string | number;
        name?: string;
    };
    details?: Record<string, unknown>;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
    };
}

function parseInteger(val: string | number | undefined | null): number | null {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return Math.floor(val);
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Log an audit event for admin actions.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
    try {
        const db = getDb();
        const actionStr = String(params.action);
        
        await db.insert(auditLogs).values({
            action: actionStr,
            actorId: parseInteger(params.actor.userId),
            actorName: params.actor.name,
            targetType: params.target?.type || null,
            targetId: params.target ? parseInteger(params.target.id) : null,
            message: `${params.actor.name} performed ${actionStr} on ${params.target?.type || 'system'}${params.target?.name ? ` (${params.target.name})` : ''}`,
            actor: params.actor,
            target: params.target || null,
            details: params.details || {},
            metadata: params.metadata || {},
        });
    } catch (error) {
        console.error('[AuditLog] Failed to log event:', error);
    }
}

/**
 * Create actor object from session user
 */
export function getActorFromSession(user: { id?: string | number; email?: string | null; name?: string | null }): AuditEventParams['actor'] {
    return {
        userId: user.id || 'unknown',
        email: user.email || 'unknown',
        name: user.name || 'Unknown User',
    };
}

/**
 * Batch log multiple audit events
 */
export async function logBulkAuditEvent(
    action: AuditAction,
    actor: AuditEventParams['actor'],
    targets: Array<{ type: AuditTargetType; id: string | number; name?: string }>,
    commonDetails?: Record<string, unknown>
): Promise<void> {
    try {
        const db = getDb();
        const actionStr = String(action);

        const events = targets.map(target => ({
            action: actionStr,
            actorId: parseInteger(actor.userId),
            actorName: actor.name,
            targetType: target.type,
            targetId: parseInteger(target.id),
            message: `${actor.name} performed ${actionStr} on ${target.type}${target.name ? ` (${target.name})` : ''} [Bulk]`,
            actor,
            target,
            details: {
                ...commonDetails,
                bulkOperation: true,
                totalInBatch: targets.length,
            },
        }));

        await db.insert(auditLogs).values(events);
    } catch (error) {
        console.error('[AuditLog] Failed to log bulk events:', error);
    }
}
