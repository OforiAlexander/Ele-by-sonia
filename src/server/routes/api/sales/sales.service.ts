import knex from '../../../models/_config';
import Sale from '../../../models/Sale';
import { paystack, type MomoProvider } from '../../../services/payment/paystack';
import { ensureLoaded, get } from '../../../startup/settingsCache';
import { SETTINGS } from '../../../constants/settings';
import logger from '../../../services/logger';

function withSaleGraph() {
    return Sale.query()
        .withGraphFetched('[items.variant, staff]')
        .modifyGraph('items.variant', (b) =>
            b.select(
                'product_variants.id',
                'product_variants.sku',
                'product_variants.product_id',
            ).join('products', 'products.id', 'product_variants.product_id')
             .select('products.name as product_name'),
        )
        .modifyGraph('staff', (b) => b.select('users.id', 'users.name'));
}

async function getGlobalDiscountRate(): Promise<number> {
    await ensureLoaded();
    const setting = get(SETTINGS.SALES_GLOBAL_DISCOUNT_RATE);
    const rate    = parseFloat(setting?.value ?? '0');
    return isNaN(rate) || rate < 0 || rate > 100 ? 0 : rate;
}

async function getLevySettings(): Promise<{ enabled: boolean; type: 'flat' | 'percent'; amount: number }> {
    await ensureLoaded();
    const enabled = get(SETTINGS.INVENTORY_LEVY_ENABLED)?.value === 'true';
    const rawType = get(SETTINGS.INVENTORY_LEVY_TYPE)?.value ?? 'flat';
    const type    = rawType === 'percent' ? 'percent' : 'flat';
    const amount  = parseFloat(get(SETTINGS.INVENTORY_LEVY_AMOUNT)?.value ?? '0');
    return { enabled, type, amount: isNaN(amount) ? 0 : amount };
}

function generateMomoReference(): string {
    return `MOMT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function processSale(
    staffId:          string,
    items:            Array<{ variant_id: string; quantity: number; unit_price_override?: number }>,
    paymentMethod:    'cash' | 'momo',
    amountTendered:   number | undefined,
    manualDiscount:   number,
    note:             string | undefined,
    customerPhone:    string | undefined,
    momoProvider:     MomoProvider | undefined,
    canOverridePrice: boolean,
): Promise<Sale> {
    const variantIds = items.map((i) => i.variant_id);
    const variants = await knex('product_variants as pv')
        .join('products as p', 'p.id', 'pv.product_id')
        .whereIn('pv.id', variantIds)
        .select('pv.*', 'p.name as product_name');

    for (const item of items) {
        const variant = variants.find((v: any) => v.id === item.variant_id);
        if (!variant) {
            throw Object.assign(
                new Error(`Variant ${item.variant_id} not found.`),
                { status: 404, code: 'NOT_FOUND' },
            );
        }
        if (!variant.is_active) {
            throw Object.assign(
                new Error(`"${variant.product_name}" is no longer available for sale.`),
                { status: 400, code: 'VARIANT_INACTIVE' },
            );
        }
        if (Number(variant.stock) < item.quantity) {
            throw Object.assign(
                new Error(
                    `Not enough stock for "${variant.product_name}". ` +
                    `You requested ${item.quantity} but only ${variant.stock} ${Number(variant.stock) === 1 ? 'is' : 'are'} available.`,
                ),
                { status: 400, code: 'STOCK_INSUFFICIENT' },
            );
        }
        if (item.unit_price_override !== undefined && !canOverridePrice) {
            throw Object.assign(
                new Error('You do not have permission to override selling prices.'),
                { status: 403, code: 'FORBIDDEN' },
            );
        }
    }

    const effectiveUnitPrices = new Map<string, number>();
    for (const item of items) {
        const variant       = variants.find((v) => v.id === item.variant_id)!;
        const originalPrice = Number(variant.selling_price);
        const useOverride   = item.unit_price_override !== undefined && canOverridePrice;
        effectiveUnitPrices.set(item.variant_id, useOverride ? item.unit_price_override! : originalPrice);
    }

    const subtotal = items.reduce((sum, item) => {
        return sum + effectiveUnitPrices.get(item.variant_id)! * item.quantity;
    }, 0);

    const globalRate     = await getGlobalDiscountRate();
    const globalDiscount = parseFloat(((globalRate / 100) * subtotal).toFixed(2));
    const totalDiscount  = parseFloat((globalDiscount + manualDiscount).toFixed(2));

    if (totalDiscount > subtotal) {
        throw Object.assign(
            new Error('Discount cannot exceed the sale total.'),
            { status: 400, code: 'VALIDATION_ERROR' },
        );
    }

    const amountDue = parseFloat((subtotal - totalDiscount).toFixed(2));

    if (paymentMethod === 'cash') {
        if (amountTendered === undefined || amountTendered === null) {
            throw Object.assign(
                new Error('amount_tendered is required for cash payments.'),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }
        if (Number(amountTendered) < amountDue) {
            throw Object.assign(
                new Error(`Amount tendered (${amountTendered}) is less than amount due (${amountDue}).`),
                { status: 400, code: 'AMOUNT_INSUFFICIENT' },
            );
        }
    }

    if (paymentMethod === 'momo') {
        if (!customerPhone) {
            throw Object.assign(
                new Error('customer_phone is required for Momo payments.'),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }
        if (!momoProvider) {
            throw Object.assign(
                new Error('momo_provider is required for Momo payments.'),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }
    }

    const levySettings = await getLevySettings();
    let levyAmount = 0;
    if (levySettings.enabled && levySettings.amount > 0) {
        for (const item of items) {
            const unitPrice = effectiveUnitPrices.get(item.variant_id)!;
            if (levySettings.type === 'flat') {
                levyAmount += levySettings.amount * item.quantity;
            } else {
                levyAmount += (levySettings.amount / 100) * unitPrice * item.quantity;
            }
        }
        levyAmount = parseFloat(levyAmount.toFixed(2));
    }

    const changeGiven   = paymentMethod === 'cash' ? Number(amountTendered) - amountDue : null;
    const paystackRef   = paymentMethod === 'momo' ? generateMomoReference() : null;
    const initialStatus = paymentMethod === 'momo'
        ? Sale.PAYMENT_STATUS_PENDING
        : Sale.PAYMENT_STATUS_PAID;

    const saleId = await knex.transaction(async (trx) => {
        await trx.raw('SELECT pg_advisory_xact_lock(1001)');

        const today  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `SL-${today}-`;
        const result = await trx('sales')
            .where('sale_number', 'like', `${prefix}%`)
            .max('sale_number as max')
            .first();
        const lastSeq    = result?.max ? parseInt((result.max as string).split('-')[2], 10) : 0;
        const saleNumber = `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;

        const [inserted] = await trx('sales').insert({
            sale_number:        saleNumber,
            staff_id:           staffId,
            payment_method:     paymentMethod,
            payment_status:     initialStatus,
            amount_due:         amountDue,
            amount_tendered:    paymentMethod === 'cash' ? amountTendered : null,
            change_given:       changeGiven,
            discount:           totalDiscount,
            levy_amount:        levyAmount,
            note:               note ?? null,
            customer_phone:     customerPhone ?? null,
            momo_provider:      momoProvider  ?? null,
            paystack_reference: paystackRef,
        }).returning('id');

        const saleItemRows = items.map((item) => {
            const variant       = variants.find((v) => v.id === item.variant_id)!;
            const originalPrice = Number(variant.selling_price);
            const effectivePrice = effectiveUnitPrices.get(item.variant_id)!;
            const isOverridden  = effectivePrice !== originalPrice;
            return {
                sale_id:             inserted.id,
                variant_id:          item.variant_id,
                quantity:            item.quantity,
                unit_price:          effectivePrice,
                line_total:          effectivePrice * item.quantity,
                cost_price_snapshot: Number(variant.cost_price),
                original_price:      originalPrice,
                price_override:      isOverridden ? effectivePrice : null,
            };
        });
        await trx('sale_items').insert(saleItemRows);

        for (const item of items) {
            const updated = await trx('product_variants')
                .where({ id: item.variant_id })
                .whereRaw('stock >= ?', [item.quantity])
                .decrement('stock', item.quantity);
            if (updated === 0) {
                const v = variants.find((x: any) => x.id === item.variant_id);
                const name = v ? `"${v.product_name}"` : 'an item in your cart';
                throw Object.assign(
                    new Error(`Stock for ${name} changed while processing. Please check the quantity and try again.`),
                    { status: 400, code: 'STOCK_INSUFFICIENT' },
                );
            }
        }

        return inserted.id;
    });

    if (paymentMethod === 'momo' && paystackRef) {
        const amountPesewas = Math.round(amountDue * 100);
        paystack.charge({
            email:        `momo-${customerPhone}@pos.internal`,
            amount:       amountPesewas,
            reference:    paystackRef,
            mobile_money: { phone: customerPhone!, provider: momoProvider! },
        }).catch((err) => {
            logger.error('[paystack] charge initiation failed for ref %s: %s', paystackRef, err.message);
            if (err.response?.data) {
                logger.error('[paystack] response body: %o', err.response.data);
            }
        });
    }

    return (await withSaleGraph().findById(saleId))!;
}

export async function listSales(options: {
    page:           number;
    limit:          number;
    from?:          string;
    to?:            string;
    paymentMethod?: string;
    includeVoided?: boolean;
}): Promise<{ sales: Sale[]; total: number; page: number; limit: number }> {
    const { page, limit, from, to, paymentMethod, includeVoided } = options;
    const offset = (page - 1) * limit;

    let base = Sale.query();
    if (!includeVoided) base = base.whereNull('voided_at');
    if (from)           base = base.where('created_at', '>=', from);
    if (to)             base = base.where('created_at', '<=', to);
    if (paymentMethod)  base = base.where({ payment_method: paymentMethod });

    const [sales, countResult] = await Promise.all([
        base.clone()
            .withGraphFetched('[staff]')
            .modifyGraph('staff', (b) => b.select('users.id', 'users.name'))
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
        const [row] = await trx('sales').where({ id }).forUpdate().select('voided_at', 'payment_status');
        if (row.voided_at) {
            throw Object.assign(
                new Error('This sale has already been voided.'),
                { status: 400, code: 'ALREADY_VOIDED' },
            );
        }
        if (row.payment_status === Sale.PAYMENT_STATUS_PENDING) {
            throw Object.assign(
                new Error('Cannot void a sale that is still awaiting payment.'),
                { status: 400, code: 'PAYMENT_PENDING' },
            );
        }

        const items = await trx('sale_items').where({ sale_id: id });
        for (const item of items) {
            await trx('product_variants')
                .where({ id: item.variant_id })
                .increment('stock', item.quantity);
        }

        await trx('sales').where({ id }).update({ voided_at: new Date(), voided_by_id: staffId });
    });

    return getSale(id);
}

export interface SaleReturnResult {
    id:              string;
    sale_id:         string;
    processed_by_id: string;
    refund_method:   string;
    note:            string | null;
    created_at:      string;
    items:           Array<{ sale_item_id: string; quantity: number }>;
}

export async function processSaleReturn(
    saleId:      string,
    staffId:     string,
    returnItems: Array<{ sale_item_id: string; quantity: number }>,
    note:        string | undefined,
): Promise<SaleReturnResult> {
    const sale = await Sale.query().findById(saleId);
    if (!sale) throw Object.assign(new Error('Sale not found.'), { status: 404, code: 'NOT_FOUND' });

    if (sale.voided_at) {
        throw Object.assign(
            new Error('Cannot return items from a voided sale.'),
            { status: 400, code: 'SALE_VOIDED' },
        );
    }
    if (sale.payment_status !== Sale.PAYMENT_STATUS_PAID) {
        throw Object.assign(
            new Error('Cannot return items from an unpaid sale.'),
            { status: 400, code: 'NOT_PAID' },
        );
    }

    await ensureLoaded();
    const refundDays    = parseInt(get(SETTINGS.REFUND_VALIDITY_DAYS)?.value ?? '7', 10);
    const saleDate      = new Date(sale.created_at);
    const daysSinceSale = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSale > refundDays) {
        throw Object.assign(
            new Error(`Returns are accepted within ${refundDays} day(s) of purchase. This sale is no longer eligible.`),
            { status: 400, code: 'RETURN_PERIOD_EXPIRED' },
        );
    }

    const originalItems = await knex('sale_items').where({ sale_id: saleId });

    for (const ri of returnItems) {
        const original = originalItems.find((i) => i.id === ri.sale_item_id);
        if (!original) {
            throw Object.assign(
                new Error(`Sale item ${ri.sale_item_id} does not belong to this sale.`),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }

        const alreadyReturned = await knex('sale_return_items')
            .where({ sale_item_id: ri.sale_item_id })
            .sum('quantity as total')
            .first();
        const previousQty  = Number(alreadyReturned?.total ?? 0);
        const remainingQty = original.quantity - previousQty;

        if (ri.quantity > remainingQty) {
            throw Object.assign(
                new Error(
                    `Cannot return ${ri.quantity} units of item ${ri.sale_item_id}. ` +
                    `Only ${remainingQty} unit(s) eligible for return.`,
                ),
                { status: 400, code: 'RETURN_EXCEEDS_QUANTITY' },
            );
        }
    }

    const returnId = await knex.transaction(async (trx) => {
        const [inserted] = await trx('sale_returns').insert({
            sale_id:          saleId,
            processed_by_id:  staffId,
            refund_method:    'cash',
            note:             note ?? null,
        }).returning('id');

        await trx('sale_return_items').insert(
            returnItems.map((ri) => ({
                return_id:    inserted.id,
                sale_item_id: ri.sale_item_id,
                quantity:     ri.quantity,
            })),
        );

        for (const ri of returnItems) {
            const original = originalItems.find((i) => i.id === ri.sale_item_id)!;
            await trx('product_variants')
                .where({ id: original.variant_id })
                .increment('stock', ri.quantity);
        }

        return inserted.id;
    });

    const returnRecord   = await knex('sale_returns').where({ id: returnId }).first();
    const returnItemRows = await knex('sale_return_items').where({ return_id: returnId });

    return {
        id:              returnRecord.id,
        sale_id:         returnRecord.sale_id,
        processed_by_id: returnRecord.processed_by_id,
        refund_method:   returnRecord.refund_method,
        note:            returnRecord.note,
        created_at:      returnRecord.created_at,
        items:           returnItemRows.map((r: any) => ({
            sale_item_id: r.sale_item_id,
            quantity:     r.quantity,
        })),
    };
}

export async function markSalePaid(paystackReference: string): Promise<void> {
    await knex('sales')
        .where({ paystack_reference: paystackReference, payment_status: Sale.PAYMENT_STATUS_PENDING })
        .update({ payment_status: Sale.PAYMENT_STATUS_PAID });
}

export async function markSaleFailed(paystackReference: string): Promise<void> {
    await knex.transaction(async (trx) => {
        const sale = await trx('sales')
            .where({ paystack_reference: paystackReference, payment_status: Sale.PAYMENT_STATUS_PENDING })
            .first();

        if (!sale) return;

        const items = await trx('sale_items').where({ sale_id: sale.id });
        for (const item of items) {
            await trx('product_variants')
                .where({ id: item.variant_id })
                .increment('stock', item.quantity);
        }

        await trx('sales')
            .where({ id: sale.id })
            .update({ payment_status: Sale.PAYMENT_STATUS_FAILED });
    });
}
