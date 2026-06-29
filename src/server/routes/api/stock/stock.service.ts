import knex from '../../../models/_config';
import ProductVariant from '../../../models/ProductVariant';
import StockEntry from '../../../models/StockEntry';
import { notifyOwner, notifyStockAlertIfNew, NOTIF_TYPES } from '../../../services/notifications/notify';
import logger from '../../../services/logger';

function notFound() {
    return Object.assign(new Error('Variant not found.'), { status: 404, code: 'NOT_FOUND' });
}

function inactiveVariant() {
    return Object.assign(new Error('Cannot modify stock for an inactive variant.'), { status: 400, code: 'VARIANT_INACTIVE' });
}

export async function getVariant(variantId: string): Promise<ProductVariant> {
    const variant = await ProductVariant.query().findById(variantId);
    if (!variant) throw notFound();
    return variant;
}

export async function listStockEntries(variantId: string) {
    await getVariant(variantId);
    return StockEntry.query()
        .where({ variant_id: variantId })
        .withGraphFetched('createdByUser')
        .modifyGraph('createdByUser', (b) => b.select('id', 'name'))
        .orderBy('created_at', 'desc');
}

export async function addStock(
    variantId: string,
    quantity: number,
    note: string | undefined,
    userId: string,
): Promise<{ variant: ProductVariant; stockBefore: number }> {
    let stockBefore!: number;

    await knex.transaction(async (trx) => {
        const row = await trx('product_variants').where({ id: variantId }).forUpdate().first();
        if (!row) throw notFound();
        if (!row.is_active) throw inactiveVariant();
        stockBefore = Number(row.stock);
        await trx('stock_entries').insert({ variant_id: variantId, quantity, note, created_by: userId });
        await trx('product_variants').where({ id: variantId }).increment('stock', quantity);
    });

    const updated = (await ProductVariant.query().findById(variantId))!;
    return { variant: updated, stockBefore };
}

export async function adjustStock(
    variantId: string,
    quantity: number,
    note: string,
    userId: string,
): Promise<{ variant: ProductVariant; stockBefore: number }> {
    let stockBefore!: number;

    await knex.transaction(async (trx) => {
        const row = await trx('product_variants').where({ id: variantId }).forUpdate().first();
        if (!row) throw notFound();
        if (!row.is_active) throw inactiveVariant();
        stockBefore = Number(row.stock);
        if (stockBefore + quantity < 0) {
            throw Object.assign(
                new Error(`Stock cannot go below zero. Current stock: ${stockBefore}.`),
                { status: 400, code: 'STOCK_INSUFFICIENT' },
            );
        }
        await trx('stock_entries').insert({ variant_id: variantId, quantity, note, created_by: userId });
        const rows = await trx('product_variants')
            .where({ id: variantId })
            .whereRaw('stock + ? >= 0', [quantity])
            .update({ stock: knex.raw('stock + ?', [quantity]) });
        if (rows === 0) {
            throw Object.assign(
                new Error('Stock cannot go below zero.'),
                { status: 400, code: 'STOCK_INSUFFICIENT' },
            );
        }
    });

    const updated = (await ProductVariant.query().findById(variantId))!;

    if (quantity < 0) {
        const newStock = Number(updated.stock);
        if (newStock <= 0) {
            notifyStockAlertIfNew('stock.view', variantId, {
                type:  NOTIF_TYPES.OUT_OF_STOCK,
                title: `Out of stock after adjustment`,
                body:  `Stock for variant ${variantId} reached zero during a manual adjustment.`,
                data:  { variant_id: variantId },
            }).catch((err: any) => logger.error('[notify] stock-adjust out-of-stock: %s', err.message));
        } else if (newStock <= Number(updated.low_stock_threshold)) {
            notifyStockAlertIfNew('stock.view', variantId, {
                type:  NOTIF_TYPES.LOW_STOCK,
                title: `Low stock after adjustment (${newStock} left)`,
                data:  { variant_id: variantId },
            }).catch((err: any) => logger.error('[notify] stock-adjust low-stock: %s', err.message));
        }

        notifyOwner({
            type:  NOTIF_TYPES.STOCK_ADJUSTED,
            title: 'Stock adjusted (negative)',
            body:  `Stock was reduced by ${Math.abs(quantity)} unit(s) for variant ${variantId}. Note: ${note}`,
            data:  { variant_id: variantId, quantity, note },
        }).catch((err: any) => logger.error('[notify] stock-adjusted: %s', err.message));
    }

    return { variant: updated, stockBefore };
}

export async function setThreshold(
    variantId: string,
    threshold: number,
): Promise<{ variant: ProductVariant; thresholdBefore: number }> {
    const variant = await getVariant(variantId);
    const thresholdBefore = variant.low_stock_threshold;
    const updated = (await ProductVariant.query().patchAndFetchById(variantId, { low_stock_threshold: threshold }))!;
    return { variant: updated, thresholdBefore };
}
