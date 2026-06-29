import knex from '../../models/_config';
import logger from '../logger';

export const NOTIF_TYPES = {
    LOW_STOCK:         'LOW_STOCK',
    OUT_OF_STOCK:      'OUT_OF_STOCK',
    SALE_VOIDED:       'SALE_VOIDED',
    PRICE_OVERRIDE:    'PRICE_OVERRIDE',
    LARGE_DISCOUNT:    'LARGE_DISCOUNT',
    STOCK_ADJUSTED:    'STOCK_ADJUSTED',
    MOMO_CONFIRMED:    'MOMO_CONFIRMED',
    MOMO_FAILED:       'MOMO_FAILED',
    STAFF_INVITED:     'STAFF_INVITED',
    STAFF_DEACTIVATED: 'STAFF_DEACTIVATED',
    STAFF_REACTIVATED: 'STAFF_REACTIVATED',
} as const;

export type NotifType = typeof NOTIF_TYPES[keyof typeof NOTIF_TYPES];

export interface NotifPayload {
    type:   NotifType;
    title:  string;
    body?:  string;
    data?:  Record<string, unknown>;
}

function buildRow(userId: string, payload: NotifPayload) {
    return {
        user_id: userId,
        type:    payload.type,
        title:   payload.title,
        body:    payload.body   ?? null,
        data:    payload.data   ? JSON.stringify(payload.data) : null,
    };
}

async function activeUsersWithPermission(permissionName: string): Promise<Array<{ id: string }>> {
    return knex('users as u')
        .where('u.is_active', true)
        .where(function () {
            this.where('u.is_owner', true).orWhereExists(
                knex('role_permissions as rp')
                    .join('permissions as p', 'p.id', 'rp.permission_id')
                    .whereRaw('rp.role_id = u.role_id')
                    .where('p.name', permissionName)
                    .select(knex.raw('1')),
            );
        })
        .select('u.id');
}

export async function notifyOwner(payload: NotifPayload): Promise<void> {
    try {
        const owner = await knex('users')
            .where({ is_owner: true, is_active: true })
            .select('id')
            .first();
        if (!owner) return;
        await knex('notifications').insert(buildRow(owner.id, payload));
    } catch (err: any) {
        logger.error('[notify] notifyOwner(%s) failed: %s', payload.type, err.message);
    }
}

export async function notifyUser(userId: string, payload: NotifPayload): Promise<void> {
    try {
        await knex('notifications').insert(buildRow(userId, payload));
    } catch (err: any) {
        logger.error('[notify] notifyUser(%s, %s) failed: %s', userId, payload.type, err.message);
    }
}

export async function notifyUsersWithPermission(permissionName: string, payload: NotifPayload): Promise<void> {
    try {
        const users = await activeUsersWithPermission(permissionName);
        if (users.length === 0) return;
        await knex('notifications').insert(users.map((u) => buildRow(u.id, payload)));
    } catch (err: any) {
        logger.error('[notify] notifyUsersWithPermission(%s, %s) failed: %s', permissionName, payload.type, err.message);
    }
}

// Deduplicates: skip inserting if we already notified this user about this variant within 24 h.
// Used by both the cron and real-time triggers to prevent the same person seeing it twice in a day.
export async function notifyStockAlertIfNew(permissionName: string, variantId: string, payload: NotifPayload): Promise<void> {
    try {
        const users = await activeUsersWithPermission(permissionName);
        if (users.length === 0) return;

        const rows = [];
        for (const u of users) {
            const exists = await knex('notifications')
                .where({ user_id: u.id, type: payload.type })
                .whereRaw("(data->>'variant_id')::text = ?", [variantId])
                .whereRaw("created_at > NOW() - INTERVAL '24 hours'")
                .first();
            if (!exists) rows.push(buildRow(u.id, payload));
        }

        if (rows.length > 0) await knex('notifications').insert(rows);
    } catch (err: any) {
        logger.error('[notify] notifyStockAlertIfNew(%s) failed: %s', variantId, err.message);
    }
}

// Notifies both the specific staff member AND the owner — deduplicates if they're the same person.
export async function notifySaleParticipants(staffId: string, payload: NotifPayload): Promise<void> {
    try {
        const owner = await knex('users')
            .where({ is_owner: true, is_active: true })
            .select('id')
            .first();

        const ids = new Set<string>([staffId]);
        if (owner) ids.add(owner.id);

        await knex('notifications').insert(Array.from(ids).map((id) => buildRow(id, payload)));
    } catch (err: any) {
        logger.error('[notify] notifySaleParticipants(%s, %s) failed: %s', staffId, payload.type, err.message);
    }
}
