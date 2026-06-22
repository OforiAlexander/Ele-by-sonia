import AuditLog from '../../models/AuditLog';

export async function writeAuditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
): Promise<void> {
    await AuditLog.query().insert({ user_id: userId, action, entity_type: entityType, entity_id: entityId, before, after });
}
