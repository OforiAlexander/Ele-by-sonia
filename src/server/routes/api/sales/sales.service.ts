import knex from '../../../models/_config';
import Sale from '../../../models/Sale';

function withSaleGraph() {
    return Sale.query()
        .withGraphFetched('[items.variant, staff]')
        .modifyGraph('items.variant', (b) => b.select('id', 'sku', 'product_id'))
        .modifyGraph('staff', (b) => b.select('id', 'name'));
}

export async function processSale(
    staffId: string,
    items: Array<{ variant_id: string; quantity: number }>,
    paymentMethod: 'cash' | 'momo',
    amountTendered: number | undefined,
    discount: number,
    note: string | undefined,
): Promise<Sale> {
    const variantIds = items.map((i) => i.variant_id);
    const variants = await knex('product_variants').whereIn('id', variantIds);

    for (const item of items) {
        const variant = variants.find((v) => v.id === item.variant_id);
        if (!variant) {
            throw Object.assign(new Error(`Variant ${item.variant_id} not found.`), { status: 404, code: 'NOT_FOUND' });
        }
        if (!variant.is_active) {
            throw Object.assign(new Error(`Variant ${item.variant_id} is inactive.`), { status: 400, code: 'VARIANT_INACTIVE' });
        }
        if (Number(variant.stock) < item.quantity) {
            throw Object.assign(
                new Error(`Insufficient stock for variant ${item.variant_id}. Available: ${variant.stock}.`),
                { status: 400, code: 'STOCK_INSUFFICIENT' },
            );
        }
    }

    const subtotal = items.reduce((sum, item) => {
        const variant = variants.find((v) => v.id === item.variant_id)!;
        return sum + Number(variant.selling_price) * item.quantity;
    }, 0);

    if (discount > subtotal) {
        throw Object.assign(new Error('Discount cannot exceed the sale total.'), { status: 400, code: 'VALIDATION_ERROR' });
    }

    const amountDue = subtotal - discount;

    if (paymentMethod === 'cash') {
        if (amountTendered === undefined || amountTendered === null) {
            throw Object.assign(new Error('amount_tendered is required for cash payments.'), { status: 400, code: 'VALIDATION_ERROR' });
        }
        if (Number(amountTendered) < amountDue) {
            throw Object.assign(
                new Error(`Amount tendered (${amountTendered}) is less than amount due (${amountDue}).`),
                { status: 400, code: 'AMOUNT_INSUFFICIENT' },
            );
        }
    }

    const changeGiven = paymentMethod === 'cash' ? Number(amountTendered) - amountDue : null;

    const saleId = await knex.transaction(async (trx) => {
        await trx.raw('SELECT pg_advisory_xact_lock(1001)');
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `SL-${today}-`;
        const result = await trx('sales').where('sale_number', 'like', `${prefix}%`).max('sale_number as max').first();
        const lastSeq = result?.max ? parseInt((result.max as string).split('-')[2], 10) : 0;
        const saleNumber = `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;

        const [inserted] = await trx('sales').insert({
            sale_number: saleNumber,
            staff_id: staffId,
            payment_method: paymentMethod,
            payment_status: Sale.PAYMENT_STATUS_PAID,
            amount_due: amountDue,
            amount_tendered: paymentMethod === 'cash' ? amountTendered : null,
            change_given: changeGiven,
            discount,
            note: note ?? null,
        }).returning('id');

        const saleItemRows = items.map((item) => {
            const variant = variants.find((v) => v.id === item.variant_id)!;
            const unitPrice = Number(variant.selling_price);
            return {
                sale_id: inserted.id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                unit_price: unitPrice,
                line_total: unitPrice * item.quantity,
                cost_price_snapshot: Number(variant.cost_price),
            };
        });
        await trx('sale_items').insert(saleItemRows);

        for (const item of items) {
            const updated = await trx('product_variants')
                .where({ id: item.variant_id })
                .whereRaw('stock >= ?', [item.quantity])
                .decrement('stock', item.quantity);
            if (updated === 0) {
                throw Object.assign(
                    new Error(`Insufficient stock for variant ${item.variant_id}.`),
                    { status: 400, code: 'STOCK_INSUFFICIENT' },
                );
            }
        }

        return inserted.id;
    });

    return (await withSaleGraph().findById(saleId))!;
}

export async function listSales(options: {
    page: number;
    limit: number;
    from?: string;
    to?: string;
    paymentMethod?: string;
}): Promise<{ sales: Sale[]; total: number; page: number; limit: number }> {
    const { page, limit, from, to, paymentMethod } = options;
    const offset = (page - 1) * limit;

    let base = Sale.query().whereNull('voided_at');
    if (from) base = base.where('created_at', '>=', from);
    if (to) base = base.where('created_at', '<=', to);
    if (paymentMethod) base = base.where({ payment_method: paymentMethod });

    const [sales, countResult] = await Promise.all([
        base.clone()
            .withGraphFetched('[items, staff]')
            .modifyGraph('staff', (b) => b.select('id', 'name'))
            .orderBy('created_at', 'desc')
            .offset(offset)
            .limit(limit),
        base.clone().count('id as count').first(),
    ]);

    return { sales, total: Number((countResult as any)?.count ?? 0), page, limit };
}

export async function getSale(id: string): Promise<Sale> {
    const sale = await withSaleGraph().findById(id);
    if (!sale) throw Object.assign(new Error('Sale not found.'), { status: 404, code: 'NOT_FOUND' });
    return sale;
}

export async function voidSale(id: string, staffId: string): Promise<Sale> {
    const sale = await Sale.query().findById(id);
    if (!sale) throw Object.assign(new Error('Sale not found.'), { status: 404, code: 'NOT_FOUND' });

    await knex.transaction(async (trx) => {
        const [row] = await trx('sales').where({ id }).forUpdate().select('voided_at');
        if (row.voided_at) {
            throw Object.assign(new Error('This sale has already been voided.'), { status: 400, code: 'ALREADY_VOIDED' });
        }

        const items = await trx('sale_items').where({ sale_id: id });
        for (const item of items) {
            await trx('product_variants').where({ id: item.variant_id }).increment('stock', item.quantity);
        }

        await trx('sales').where({ id }).update({ voided_at: new Date(), voided_by_id: staffId });
    });

    return getSale(id);
}
