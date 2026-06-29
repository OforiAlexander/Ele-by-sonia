import knex from '../models/_config';
import logger from '../services/logger';

export async function runCleanupNotifications(): Promise<void> {
    const deleted = await knex('notifications')
        .whereRaw("created_at < NOW() - INTERVAL '7 days'")
        .delete();

    if (deleted > 0) {
        logger.info('[cleanup-notifications] Deleted %d notification(s) older than 7 days', deleted);
    }
}
