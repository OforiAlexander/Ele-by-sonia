import knex from '../../../models/_config';

export interface NotificationRow {
    id:         string;
    user_id:    string;
    type:       string;
    title:      string;
    body:       string | null;
    data:       Record<string, unknown> | null;
    read_at:    string | null;
    created_at: string;
}

export async function getNotificationsForUser(userId: string, limit = 40): Promise<NotificationRow[]> {
    return knex('notifications')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .select('*');
}

export async function getUnreadCount(userId: string): Promise<number> {
    const row = await knex('notifications')
        .where({ user_id: userId })
        .whereNull('read_at')
        .count('id as count')
        .first();
    return Number(row?.count ?? 0);
}

export async function markAllRead(userId: string): Promise<void> {
    await knex('notifications')
        .where({ user_id: userId })
        .whereNull('read_at')
        .update({ read_at: new Date() });
}
