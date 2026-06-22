import knex from '../../../models/_config';
import ProductVariant from '../../../models/ProductVariant';
import StockEntry from '../../../models/StockEntry';

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
    const variant = await getVariant(variantId);
    if (!variant.is_active) throw inactiveVariant();

    const stockBefore = variant.stock;

    await knex.transaction(async (trx) => {
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
    const variant = await getVariant(variantId);
    if (!variant.is_active) throw inactiveVariant();

    if (variant.stock + quantity < 0) {
        throw Object.assign(
            new Error(`Stock cannot go below zero. Current stock: ${variant.stock}.`),
            { status: 400, code: 'STOCK_INSUFFICIENT' },
        );
    }

    const stockBefore = variant.stock;

    await knex.transaction(async (trx) => {
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
