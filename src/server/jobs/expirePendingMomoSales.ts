import knex from '../models/_config';
import Sale from '../models/Sale';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import logger from '../services/logger';

export async function expirePendingMomoSales(): Promise<void> {
    await ensureLoaded();
    const timeoutMinutes = parseInt(get(SETTINGS.MOMO_PENDING_TIMEOUT_MINUTES)?.value ?? '15', 10);

    const expiredSales = await knex('sales')
        .where({ payment_status: Sale.PAYMENT_STATUS_PENDING })
        .whereRaw(`created_at < NOW() - INTERVAL '${timeoutMinutes} minutes'`)
        .select('id');

    if (expiredSales.length === 0) return;

    logger.info('[momo-expiry] Found %d pending sale(s) past %d-minute timeout', expiredSales.length, timeoutMinutes);

    for (const { id } of expiredSales) {
        try {
            await knex.transaction(async (trx) => {
                const sale = await trx('sales')
                    .where({ id, payment_status: Sale.PAYMENT_STATUS_PENDING })
                    .first();

                if (!sale) return;

                const items = await trx('sale_items').where({ sale_id: id });
                for (const item of items) {
                    await trx('product_variants')
                        .where({ id: item.variant_id })
                        .increment('stock', item.quantity);
                }

                await trx('sales')
                    .where({ id })
                    .update({ payment_status: Sale.PAYMENT_STATUS_FAILED });
            });

            logger.info('[momo-expiry] Expired and stock restored for sale %s', id);
        } catch (err) {
            logger.error('[momo-expiry] Failed to expire sale %s: %o', id, err);
        }
    }
}
