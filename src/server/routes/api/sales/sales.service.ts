import knex from '../../../models/_config';
import Sale from '../../../models/Sale';
import { paystack, type MomoProvider } from '../../../services/payment/paystack';
import { ensureLoaded, get } from '../../../startup/settingsCache';
import { SETTINGS } from '../../../constants/settings';
import { sendMail } from '../../../services/mail/send-mail';
import { buildVoidAlertHtml } from '../../../services/mail/templates/void-alert';
import { notifyOwner, notifySaleParticipants, notifyStockAlertIfNew, NOTIF_TYPES } from '../../../services/notifications/notify';
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
    const rate = parseFloat(get(SETTINGS.SALES_GLOBAL_DISCOUNT_RATE)?.value ?? '0');
    return isNaN(rate) || rate < 0 || rate > 100 ? 0 : rate;
}

async function getMaxDiscountPercent(): Promise<number> {
    const val = parseFloat(get(SETTINGS.MAX_DISCOUNT_PERCENT)?.value ?? '100');
    return isNaN(val) || val < 0 || val > 100 ? 100 : val;
}

async function isSplitTenderEnabled(): Promise<boolean> {
    return get(SETTINGS.SPLIT_TENDER_ENABLED)?.value === 'true';
}

async function getTaxSettings(): Promise<{
    vatEnabled:      boolean;
    nhilEnabled:     boolean;
    getfundEnabled:  boolean;
    covidEnabled:    boolean;
    taxInclusive:    boolean;
    cashRounding:    boolean;
    requirePhone:    boolean;
    allowOverride:   boolean;
    autoVerify:      boolean;
}> {
    await ensureLoaded();
    return {
        vatEnabled:     get(SETTINGS.VAT_ENABLED)?.value === 'true',
        nhilEnabled:    get(SETTINGS.NHIL_ENABLED)?.value === 'true',
        getfundEnabled: get(SETTINGS.GETFUND_ENABLED)?.value === 'true',
        covidEnabled:   get(SETTINGS.COVID_LEVY_ENABLED)?.value === 'true',
        taxInclusive:   get(SETTINGS.TAX_INCLUSIVE_PRICING)?.value !== 'false',
        cashRounding:   get(SETTINGS.CASH_ROUNDING_ENABLED)?.value === 'true',
        requirePhone:   get(SETTINGS.REQUIRE_CUSTOMER_PHONE_FOR_MOMO)?.value !== 'false',
        allowOverride:  get(SETTINGS.ALLOW_PRICE_OVERRIDE)?.value !== 'false',
        autoVerify:     get(SETTINGS.MOMO_AUTO_VERIFY_ON_WEBHOOK)?.value !== 'false',
    };
}

function parseRecipients(raw: string): string {
    return raw.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
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
    paymentMethod:    'cash' | 'momo' | 'split',
    amountTendered:   number | undefined,
    manualDiscount:   number,
    note:             string | undefined,
    customerPhone:    string | undefined,
    momoProvider:     MomoProvider | undefined,
    canOverridePrice: boolean,
    cashSplitAmount?: number,
): Promise<Sale> {
    const variantIds = items.map((i) => i.variant_id);
    const variants = await knex('product_variants as pv')
        .join('products as p', 'p.id', 'pv.product_id')
        .whereIn('pv.id', variantIds)
        .select('pv.*', 'p.name as product_name');

    const policySettings = await getTaxSettings();

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
        if (item.unit_price_override !== undefined && (!canOverridePrice || !policySettings.allowOverride)) {
            throw Object.assign(
                new Error('Price overrides are not permitted for this sale.'),
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

    if (paymentMethod === 'split' && !(await isSplitTenderEnabled())) {
        throw Object.assign(
            new Error('Split payment is not enabled for this store.'),
            { status: 400, code: 'SPLIT_TENDER_DISABLED' },
        );
    }

    const globalRate     = await getGlobalDiscountRate();
    const globalDiscount = parseFloat(((globalRate / 100) * subtotal).toFixed(2));
    const totalDiscount  = parseFloat((globalDiscount + manualDiscount).toFixed(2));

    const maxDiscountPct    = await getMaxDiscountPercent();
    const totalDiscountPct  = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
    if (totalDiscountPct > maxDiscountPct) {
        throw Object.assign(
            new Error(`Total discount (${totalDiscountPct.toFixed(1)}%) exceeds the maximum allowed (${maxDiscountPct}%).`),
            { status: 400, code: 'DISCOUNT_EXCEEDS_MAX' },
        );
    }

    if (totalDiscount > subtotal) {
        throw Object.assign(
            new Error('Discount cannot exceed the sale total.'),
            { status: 400, code: 'VALIDATION_ERROR' },
        );
    }

    let amountDue = parseFloat((subtotal - totalDiscount).toFixed(2));

    const VAT_RATE     = 0.15;
    const NHIL_RATE    = 0.025;
    const GETFUND_RATE = 0.025;
    const COVID_RATE   = 0.01;

    const combinedTaxRate =
        (policySettings.vatEnabled    ? VAT_RATE     : 0) +
        (policySettings.nhilEnabled   ? NHIL_RATE    : 0) +
        (policySettings.getfundEnabled? GETFUND_RATE : 0) +
        (policySettings.covidEnabled  ? COVID_RATE   : 0);

    let vatAmount     = 0;
    let nhilAmount    = 0;
    let getfundAmount = 0;
    let covidAmount   = 0;

    if (combinedTaxRate > 0) {
        if (policySettings.taxInclusive) {
            const base     = amountDue / (1 + combinedTaxRate);
            vatAmount      = policySettings.vatEnabled     ? parseFloat((base * VAT_RATE).toFixed(2))     : 0;
            nhilAmount     = policySettings.nhilEnabled    ? parseFloat((base * NHIL_RATE).toFixed(2))    : 0;
            getfundAmount  = policySettings.getfundEnabled ? parseFloat((base * GETFUND_RATE).toFixed(2)) : 0;
            covidAmount    = policySettings.covidEnabled   ? parseFloat((base * COVID_RATE).toFixed(2))   : 0;
        } else {
            vatAmount      = policySettings.vatEnabled     ? parseFloat((amountDue * VAT_RATE).toFixed(2))     : 0;
            nhilAmount     = policySettings.nhilEnabled    ? parseFloat((amountDue * NHIL_RATE).toFixed(2))    : 0;
            getfundAmount  = policySettings.getfundEnabled ? parseFloat((amountDue * GETFUND_RATE).toFixed(2)) : 0;
            covidAmount    = policySettings.covidEnabled   ? parseFloat((amountDue * COVID_RATE).toFixed(2))   : 0;
            amountDue      = parseFloat((amountDue + vatAmount + nhilAmount + getfundAmount + covidAmount).toFixed(2));
        }
    }

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

    if (paymentMethod === 'split') {
        if (cashSplitAmount! < 0 || cashSplitAmount! >= amountDue) {
            throw Object.assign(
                new Error('cash_split_amount must be between 0 and the amount due (exclusive).'),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }
    }

    if (paymentMethod === 'momo') {
        if (policySettings.requirePhone && !customerPhone) {
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

    if (paymentMethod === 'split') {
        if (!customerPhone) {
            throw Object.assign(
                new Error('customer_phone is required for split payments (Momo portion).'),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }
        if (!momoProvider) {
            throw Object.assign(
                new Error('momo_provider is required for split payments.'),
                { status: 400, code: 'VALIDATION_ERROR' },
            );
        }
        if (cashSplitAmount === undefined || cashSplitAmount === null) {
            throw Object.assign(
                new Error('cash_split_amount is required for split payments.'),
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

    let rawChange = paymentMethod === 'cash' ? Number(amountTendered) - amountDue : null;
    if (rawChange !== null && policySettings.cashRounding) {
        rawChange = parseFloat((Math.round(rawChange / 0.5) * 0.5).toFixed(2));
    }
    const changeGiven = rawChange;

    const momoSplitAmount   = paymentMethod === 'split' ? parseFloat((amountDue - cashSplitAmount!).toFixed(2)) : null;
    const paystackRef       = (paymentMethod === 'momo' || paymentMethod === 'split') ? generateMomoReference() : null;
    const initialStatus     = (paymentMethod === 'momo' || paymentMethod === 'split')
        ? Sale.PAYMENT_STATUS_PENDING
        : Sale.PAYMENT_STATUS_PAID;

    const saleId = await knex.transaction(async (trx) => {
        await trx.raw('SELECT pg_advisory_xact_lock(1001)');

        const rawPrefix  = get(SETTINGS.SALE_NUMBER_PREFIX)?.value ?? 'SL';
        const today      = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const prefix     = `${rawPrefix}-${today}-`;
        const result     = await trx('sales')
            .where('sale_number', 'like', `${prefix}%`)
            .max('sale_number as max')
            .first();
        const lastSeq    = result?.max ? parseInt((result.max as string).slice(prefix.length), 10) : 0;
        const saleNumber = `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;

        const [inserted] = await trx('sales').insert({
            sale_number:        saleNumber,
            staff_id:           staffId,
            payment_method:     paymentMethod,
            payment_status:     initialStatus,
            amount_due:         amountDue,
            amount_tendered:    paymentMethod === 'cash'
                ? amountTendered
                : paymentMethod === 'split'
                    ? cashSplitAmount
                    : null,
            change_given:       changeGiven,
            discount:           totalDiscount,
            levy_amount:        levyAmount,
            vat_amount:         vatAmount,
            nhil_amount:        nhilAmount,
            getfund_amount:     getfundAmount,
            covid_levy_amount:  covidAmount,
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

    // fire-and-forget: never blocks the sale response
    (async () => {
        try {
            await ensureLoaded();
            const negAlertEnabled    = get(SETTINGS.NEGATIVE_STOCK_ALERT_ENABLED)?.value === 'true';
            const autoDeactivate     = get(SETTINGS.AUTO_DEACTIVATE_ZERO_STOCK)?.value === 'true';
            const largeSaleEnabled   = get(SETTINGS.LARGE_SALE_ALERT_ENABLED)?.value === 'true';
            const largeSaleThreshold = parseFloat(get(SETTINGS.LARGE_SALE_ALERT_THRESHOLD)?.value ?? '0');
            const ownerEmail         = process.env.OWNER_EMAIL;
            const businessName       = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';

            const postSaleVariants = await knex('product_variants as pv')
                .join('products as p', 'p.id', 'pv.product_id')
                .whereIn('pv.id', items.map((i) => i.variant_id))
                .select('pv.id', 'pv.stock', 'pv.low_stock_threshold', 'pv.is_active', 'p.name as product_name');

            for (const v of postSaleVariants) {
                if (Number(v.stock) <= 0) {
                    if (autoDeactivate && v.is_active) {
                        await knex('product_variants').where({ id: v.id }).update({ is_active: false });
                    }
                    if (negAlertEnabled && ownerEmail) {
                        sendMail({
                            to:      ownerEmail,
                            subject: `Out of Stock — ${v.product_name} [${businessName}]`,
                            html:    `<p><strong>${v.product_name}</strong> has reached zero stock after sale <strong>${saleId}</strong>. Please restock promptly.</p>`,
                        }).catch((err: any) => logger.error('[stock-alert] %s', err.message));
                    }
                    notifyStockAlertIfNew('stock.view', v.id, {
                        type:  NOTIF_TYPES.OUT_OF_STOCK,
                        title: `Out of stock: ${v.product_name}`,
                        data:  { variant_id: v.id },
                    }).catch((err: any) => logger.error('[notify] out-of-stock: %s', err.message));
                } else if (Number(v.stock) <= Number(v.low_stock_threshold)) {
                    notifyStockAlertIfNew('stock.view', v.id, {
                        type:  NOTIF_TYPES.LOW_STOCK,
                        title: `Low stock: ${v.product_name} (${v.stock} left)`,
                        data:  { variant_id: v.id },
                    }).catch((err: any) => logger.error('[notify] low-stock: %s', err.message));
                }
            }

            const hasOverride = items.some((item) => {
                const variant       = variants.find((v: any) => v.id === item.variant_id);
                const originalPrice = variant ? Number(variant.selling_price) : 0;
                const effectivePrice = effectiveUnitPrices.get(item.variant_id) ?? originalPrice;
                return effectivePrice !== originalPrice;
            });
            if (hasOverride) {
                notifyOwner({
                    type:  NOTIF_TYPES.PRICE_OVERRIDE,
                    title: 'Price override used on sale',
                    body:  `A cashier used a price override on sale (reference: ${saleId}).`,
                    data:  { sale_id: saleId },
                }).catch((err: any) => logger.error('[notify] price-override: %s', err.message));
            }

            if (manualDiscount > 0) {
                notifyOwner({
                    type:  NOTIF_TYPES.LARGE_DISCOUNT,
                    title: 'Manual discount applied',
                    body:  `A discount of ${manualDiscount.toFixed(2)} was applied to a sale.`,
                    data:  { sale_id: saleId, discount: manualDiscount },
                }).catch((err: any) => logger.error('[notify] large-discount: %s', err.message));
            }

            if (largeSaleEnabled && largeSaleThreshold > 0 && amountDue >= largeSaleThreshold && ownerEmail) {
                sendMail({
                    to:      ownerEmail,
                    subject: `Large Sale Alert — GHS ${amountDue.toFixed(2)} [${businessName}]`,
                    html:    `<p>A large sale of <strong>GHS ${amountDue.toFixed(2)}</strong> was processed (sale ID: ${saleId}). Review it in the dashboard if needed.</p>`,
                }).catch((err: any) => logger.error('[large-sale-alert] %s', err.message));
            }
        } catch (err: any) {
            logger.error('[inventory-intelligence] post-sale check failed: %s', err.message);
        }
    })();

    if ((paymentMethod === 'momo' || paymentMethod === 'split') && paystackRef) {
        const chargeAmount  = paymentMethod === 'split' ? momoSplitAmount! : amountDue;
        const amountPesewas = Math.round(chargeAmount * 100);
        const currency      = get(SETTINGS.PAYSTACK_CURRENCY)?.value ?? 'GHS';
        paystack.charge({
            email:        `momo-${customerPhone}@pos.internal`,
            amount:       amountPesewas,
            currency,
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

export interface TransactionStats {
    totalCount:   number;
    cashTotal:    number;
    momoTotal:    number;
    pendingTotal: number;
}

export async function listSales(options: {
    page:           number;
    limit:          number;
    from?:          string;
    to?:            string;
    paymentMethod?: string;
    paymentStatus?: string;
    includeVoided?: boolean;
    includeStats?:  boolean;
}): Promise<{ sales: Sale[]; total: number; page: number; limit: number; stats?: TransactionStats }> {
    const { page, limit, from, to, paymentMethod, paymentStatus, includeVoided, includeStats } = options;
    const offset = (page - 1) * limit;

    let base = Sale.query();
    if (!includeVoided) base = base.whereNull('voided_at');
    if (from)           base = base.whereRaw('created_at::date >= ?', [from]);
    if (to)             base = base.whereRaw('created_at::date <= ?', [to]);
    if (paymentMethod)  base = base.where({ payment_method: paymentMethod });
    if (paymentStatus)  base = base.where({ payment_status: paymentStatus });

    const queries: PromiseLike<any>[] = [
        base.clone()
            .withGraphFetched('[staff]')
            .modifyGraph('staff', (b) => b.select('users.id', 'users.name'))
            .orderBy('created_at', 'desc')
            .offset(offset)
            .limit(limit) as unknown as PromiseLike<any>,
        base.clone().count('id as count').first() as unknown as PromiseLike<any>,
    ];

    if (includeStats) {
        const statsBase = knex('sales').whereNull('voided_at');
        if (from) statsBase.whereRaw('created_at::date >= ?', [from]);
        if (to)   statsBase.whereRaw('created_at::date <= ?', [to]);
        queries.push(
            statsBase.select(
                knex.raw('COUNT(*)::int AS total_count'),
                knex.raw("COALESCE(SUM(CASE WHEN payment_method='cash'  AND payment_status='paid' THEN amount_due ELSE 0 END),0)::numeric AS cash_total"),
                knex.raw("COALESCE(SUM(CASE WHEN payment_method='momo'  AND payment_status='paid' THEN amount_due ELSE 0 END),0)::numeric AS momo_total"),
                knex.raw("COALESCE(SUM(CASE WHEN payment_status='pending'                         THEN amount_due ELSE 0 END),0)::numeric AS pending_total"),
            ).first() as unknown as PromiseLike<any>,
        );
    }

    const results = await Promise.all(queries);
    const [sales, countResult, statsRow] = results as [Sale[], any, any];

    const stats: TransactionStats | undefined = includeStats ? {
        totalCount:   Number(statsRow?.total_count   ?? 0),
        cashTotal:    parseFloat(statsRow?.cash_total    ?? '0'),
        momoTotal:    parseFloat(statsRow?.momo_total    ?? '0'),
        pendingTotal: parseFloat(statsRow?.pending_total ?? '0'),
    } : undefined;

    return { sales, total: Number((countResult as any)?.count ?? 0), page, limit, stats };
}

export async function verifyPayment(saleId: string, staffId: string): Promise<{
    sale:           Sale;
    confirmed:      boolean;
    paystackStatus: string;
    message:        string;
}> {
    const sale = await Sale.query().findById(saleId);
    if (!sale) throw Object.assign(new Error('Sale not found.'), { status: 404, code: 'NOT_FOUND' });
    if (sale.payment_method !== 'momo') {
        throw Object.assign(new Error('Payment verification is only available for Mobile Money transactions.'), { status: 400, code: 'INVALID_OPERATION' });
    }
    if (!sale.paystack_reference) {
        throw Object.assign(new Error('This sale has no Paystack reference to verify.'), { status: 400, code: 'INVALID_OPERATION' });
    }
    if (sale.voided_at) {
        throw Object.assign(new Error('Cannot verify payment on a voided sale.'), { status: 400, code: 'INVALID_OPERATION' });
    }
    if (sale.payment_status === Sale.PAYMENT_STATUS_PAID) {
        throw Object.assign(new Error('This payment is already confirmed as paid.'), { status: 400, code: 'ALREADY_PAID' });
    }

    let paystackStatus: string;
    try {
        const result = await paystack.verifyTransaction(sale.paystack_reference);
        paystackStatus = result.data?.status ?? 'unknown';
    } catch (paystackErr: any) {
        const detail = paystackErr?.response?.data?.message ?? paystackErr?.message ?? 'unknown';
        logger.error('[paystack] verify failed for ref %s: %s', sale.paystack_reference, detail);
        return {
            sale,
            confirmed:      false,
            paystackStatus: 'failed',
            message:        'Payment failed.',
        };
    }

    if (paystackStatus === 'success') {
        await Sale.query().patchAndFetchById(saleId, { payment_status: Sale.PAYMENT_STATUS_PAID });
        return {
            sale:           (await getSale(saleId))!,
            confirmed:      true,
            paystackStatus: 'success',
            message:        'Payment confirmed. Sale is now marked as paid.',
        };
    }

    return {
        sale,
        confirmed:      false,
        paystackStatus,
        message:        'Payment failed.',
    };
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

    const voidedSale = await getSale(id);

    const alertEnabled = get(SETTINGS.VOID_ALERT_ENABLED)?.value === 'true';
    const ownerEmail   = process.env.OWNER_EMAIL;
    if (alertEnabled && ownerEmail) {
        const businessName    = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
        const logoUrl         = `${process.env.BASE_URL}/images/logo.png`;
        const currency        = get(SETTINGS.PAYSTACK_CURRENCY)?.value ?? 'GHS';
        const extraRecipients = parseRecipients(get(SETTINGS.VOID_ALERT_RECIPIENTS)?.value ?? '');
        const html = buildVoidAlertHtml({
            businessName,
            logoUrl,
            saleRef:  sale.sale_number,
            amount:   Number(sale.amount_due),
            currency,
            voidedBy: voidedSale.staff?.name ?? '—',
            voidedAt: new Date(),
        });
        sendMail({
            to:      ownerEmail,
            cc:      extraRecipients || undefined,
            subject: `Sale Voided — ${sale.sale_number}`,
            html,
        }).catch((err: any) => logger.error('[void-alert] Failed to send void alert: %s', err.message));
    }

    notifyOwner({
        type:  NOTIF_TYPES.SALE_VOIDED,
        title: `Sale voided: ${sale.sale_number}`,
        body:  `${voidedSale.staff?.name ?? 'A cashier'} voided sale ${sale.sale_number}.`,
        data:  { sale_id: id, sale_number: sale.sale_number },
    }).catch((err: any) => logger.error('[notify] void: %s', err.message));

    return voidedSale;
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
    const sale = await knex('sales')
        .where({ paystack_reference: paystackReference, payment_status: Sale.PAYMENT_STATUS_PENDING })
        .select('id', 'sale_number', 'staff_id', 'amount_due')
        .first();

    if (!sale) return;

    await knex('sales').where({ id: sale.id }).update({ payment_status: Sale.PAYMENT_STATUS_PAID });

    notifySaleParticipants(sale.staff_id, {
        type:  NOTIF_TYPES.MOMO_CONFIRMED,
        title: `Momo payment confirmed: ${sale.sale_number}`,
        body:  `GHS ${Number(sale.amount_due).toFixed(2)} received via Mobile Money.`,
        data:  { sale_id: sale.id, sale_number: sale.sale_number },
    }).catch((err: any) => logger.error('[notify] momo-confirmed: %s', err.message));
}

export async function markSaleFailed(paystackReference: string): Promise<void> {
    let staffId: string | null = null;
    let saleNumber: string | null = null;
    let saleDbId: string | null = null;

    await knex.transaction(async (trx) => {
        const sale = await trx('sales')
            .where({ paystack_reference: paystackReference, payment_status: Sale.PAYMENT_STATUS_PENDING })
            .first();

        if (!sale) return;

        staffId   = sale.staff_id;
        saleNumber = sale.sale_number;
        saleDbId  = sale.id;

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

    if (staffId && saleNumber && saleDbId) {
        notifySaleParticipants(staffId, {
            type:  NOTIF_TYPES.MOMO_FAILED,
            title: `Momo payment failed: ${saleNumber}`,
            body:  'The Mobile Money payment was not successful. Stock has been reinstated.',
            data:  { sale_id: saleDbId, sale_number: saleNumber },
        }).catch((err: any) => logger.error('[notify] momo-failed: %s', err.message));
    }
}
