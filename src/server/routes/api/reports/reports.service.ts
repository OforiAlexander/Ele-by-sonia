import knex from '../../../models/_config';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
type TruncUnit = 'hour' | 'day' | 'month';

interface PeriodRange { from: Date; to: Date; truncUnit: TruncUnit; }

function resolvePeriod(period: Period, date?: string): PeriodRange {
    const anchor = date ? new Date(date + 'T00:00:00Z') : new Date();
    const y = anchor.getUTCFullYear();
    const m = anchor.getUTCMonth();
    const d = anchor.getUTCDate();

    switch (period) {
        case 'daily':
            return {
                from: new Date(Date.UTC(y, m, d, 0, 0, 0)),
                to:   new Date(Date.UTC(y, m, d, 23, 59, 59, 999)),
                truncUnit: 'hour',
            };
        case 'weekly': {
            const dow = anchor.getUTCDay();
            const toMonday = dow === 0 ? -6 : 1 - dow;
            const weekStart = new Date(Date.UTC(y, m, d + toMonday));
            const weekEnd   = new Date(weekStart);
            weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
            weekEnd.setUTCHours(23, 59, 59, 999);
            return { from: weekStart, to: weekEnd, truncUnit: 'day' };
        }
        case 'monthly':
            return {
                from: new Date(Date.UTC(y, m, 1)),
                to:   new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
                truncUnit: 'day',
            };
        case 'quarterly': {
            const q = Math.floor(m / 3);
            return {
                from: new Date(Date.UTC(y, q * 3, 1)),
                to:   new Date(Date.UTC(y, (q + 1) * 3, 0, 23, 59, 59, 999)),
                truncUnit: 'month',
            };
        }
        case 'annual':
            return {
                from: new Date(Date.UTC(y, 0, 1)),
                to:   new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
                truncUnit: 'month',
            };
    }
}

function buildBuckets(period: Period, from: Date): { label: string; key: string }[] {
    const y = from.getUTCFullYear();
    const m = from.getUTCMonth();
    const d = from.getUTCDate();

    switch (period) {
        case 'daily':
            return Array.from({ length: 24 }, (_, h) => ({
                label: String(h),
                key:   String(h).padStart(2, '0'),
            }));
        case 'weekly':
            return Array.from({ length: 7 }, (_, i) => {
                const day = new Date(Date.UTC(y, m, d + i));
                return { label: DAY_NAMES[day.getUTCDay()], key: day.toISOString().slice(0, 10) };
            });
        case 'monthly': {
            const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
            return Array.from({ length: days }, (_, i) => ({
                label: String(i + 1),
                key:   String(i + 1).padStart(2, '0'),
            }));
        }
        case 'quarterly': {
            const startMonth = Math.floor(m / 3) * 3;
            return [0, 1, 2].map((i) => ({
                label: MONTH_NAMES[startMonth + i],
                key:   `${y}-${String(startMonth + i + 1).padStart(2, '0')}`,
            }));
        }
        case 'annual':
            return MONTH_NAMES.map((label, i) => ({
                label,
                key: `${y}-${String(i + 1).padStart(2, '0')}`,
            }));
    }
}

function bucketKeyFormat(truncUnit: TruncUnit, period: Period): string {
    if (truncUnit === 'hour') return 'HH24';
    if (period === 'monthly') return 'DD';
    if (truncUnit === 'day') return 'YYYY-MM-DD';
    return 'YYYY-MM';
}

function baseQuery(from: Date, to: Date) {
    return knex('sale_items as si')
        .join('sales as s', 's.id', 'si.sale_id')
        .whereNull('s.voided_at')
        .where('s.created_at', '>=', from)
        .where('s.created_at', '<=', to);
}

export async function getSummary(period: Period, date?: string) {
    const { from, to } = resolvePeriod(period, date);

    const [row] = await baseQuery(from, to).select(
        knex.raw('COALESCE(SUM(si.line_total), 0) as revenue'),
        knex.raw('COALESCE(SUM(si.cost_price_snapshot * si.quantity), 0) as cost'),
        knex.raw('COUNT(DISTINCT s.id)::int as sales_count'),
        knex.raw('COALESCE(SUM(si.quantity), 0)::int as units_sold'),
    );

    const revenue = Number(row.revenue);
    const cost    = Number(row.cost);
    const profit  = revenue - cost;

    return {
        period,
        from:          from.toISOString().slice(0, 10),
        to:            to.toISOString().slice(0, 10),
        revenue,
        cost,
        profit,
        marginPercent: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
        salesCount:    row.sales_count,
        unitsSold:     row.units_sold,
    };
}

export async function getProfitBreakdown(period: Period, date?: string, groupBy = 'category') {
    const { from, to } = resolvePeriod(period, date);

    let query = baseQuery(from, to).select(
        knex.raw('COALESCE(SUM(si.line_total), 0) as revenue'),
        knex.raw('COALESCE(SUM(si.cost_price_snapshot * si.quantity), 0) as cost'),
    );

    if (groupBy === 'category' || groupBy === 'product') {
        query = query
            .join('product_variants as pv', 'pv.id', 'si.variant_id')
            .join('products as p', 'p.id', 'pv.product_id');
        if (groupBy === 'category') {
            query = query.select(knex.raw('p.category as grp')).groupBy('p.category');
        } else {
            query = query.select(knex.raw('p.name as grp')).groupBy('p.id', 'p.name');
        }
    } else if (groupBy === 'staff') {
        query = query
            .join('users as u', 'u.id', 's.staff_id')
            .select(knex.raw('u.name as grp')).groupBy('u.id', 'u.name');
    } else {
        query = query.select(knex.raw('s.payment_method as grp')).groupBy('s.payment_method');
    }

    const rows = await query.orderByRaw('revenue DESC');

    return rows.map((row: any) => {
        const revenue = Number(row.revenue);
        const cost    = Number(row.cost);
        const profit  = revenue - cost;
        return {
            group:  row.grp,
            revenue,
            cost,
            profit,
            margin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0,
        };
    });
}

export async function getTopProducts(period: Period, date?: string, limitN = 10) {
    const { from, to } = resolvePeriod(period, date);

    const result = await knex.raw(`
        WITH variant_options AS (
            SELECT vov.variant_id,
                   STRING_AGG(pov.value, ' / ' ORDER BY pot.name) AS options
            FROM   variant_option_values vov
            JOIN   product_option_values pov ON pov.id = vov.option_value_id
            JOIN   product_option_types  pot ON pot.id = pov.option_type_id
            GROUP  BY vov.variant_id
        ),
        sales_agg AS (
            SELECT si.variant_id,
                   SUM(si.quantity)::int AS units_sold,
                   SUM(si.line_total)    AS revenue
            FROM   sale_items si
            JOIN   sales s ON s.id = si.sale_id
            WHERE  s.voided_at IS NULL
              AND  s.created_at >= ? AND s.created_at <= ?
            GROUP  BY si.variant_id
        )
        SELECT sa.variant_id,
               p.name    AS product_name,
               pv.sku,
               COALESCE(vo.options, '') AS options,
               sa.units_sold,
               sa.revenue
        FROM   sales_agg sa
        JOIN   product_variants pv ON pv.id = sa.variant_id
        JOIN   products         p  ON p.id  = pv.product_id
        LEFT JOIN variant_options vo ON vo.variant_id = sa.variant_id
        ORDER  BY sa.units_sold DESC
        LIMIT  ?
    `, [from, to, limitN]);

    return result.rows.map((row: any) => ({
        variantId:   row.variant_id,
        productName: row.product_name,
        sku:         row.sku ?? null,
        options:     row.options || null,
        unitsSold:   row.units_sold,
        revenue:     Number(row.revenue),
    }));
}

export async function getChart(period: Period, date?: string, metric = 'revenue') {
    const { from, to, truncUnit } = resolvePeriod(period, date);
    const buckets = buildBuckets(period, from);
    const fmt     = bucketKeyFormat(truncUnit, period);

    const metricExpr =
        metric === 'profit' ? 'SUM(si.line_total - si.cost_price_snapshot * si.quantity)' :
        metric === 'units'  ? 'SUM(si.quantity)' :
                              'SUM(si.line_total)';

    const trunc = `DATE_TRUNC('${truncUnit}', s.created_at)`;

    const result = await knex.raw(`
        SELECT TO_CHAR(${trunc}, '${fmt}') AS bucket_key,
               ${metricExpr} AS value
        FROM   sale_items si
        JOIN   sales s ON s.id = si.sale_id
        WHERE  s.voided_at IS NULL
          AND  s.created_at >= ? AND s.created_at <= ?
        GROUP  BY ${trunc}
        ORDER  BY ${trunc}
    `, [from, to]);

    const dataMap = new Map<string, number>(
        result.rows.map((r: any) => [r.bucket_key as string, Number(r.value)])
    );

    return {
        labels: buckets.map((b) => b.label),
        values: buckets.map((b) => dataMap.get(b.key) ?? 0),
    };
}

export async function getStockHealth() {
    const [row] = await knex('product_variants')
        .where({ is_active: true })
        .select(
            knex.raw('COUNT(*)::int AS total'),
            knex.raw('COUNT(CASE WHEN stock > low_stock_threshold THEN 1 END)::int AS healthy'),
            knex.raw('COUNT(CASE WHEN stock > 0 AND stock <= low_stock_threshold THEN 1 END)::int AS low_stock'),
            knex.raw('COUNT(CASE WHEN stock = 0 THEN 1 END)::int AS out_of_stock'),
            knex.raw('COALESCE(SUM(stock::decimal * cost_price::decimal), 0) AS inventory_value'),
        );

    return {
        total:          row.total,
        healthy:        row.healthy,
        lowStock:       row.low_stock,
        outOfStock:     row.out_of_stock,
        inventoryValue: Number(row.inventory_value),
    };
}

export async function getTaxBreakdown(period: Period, date?: string) {
    const { from, to } = resolvePeriod(period, date);

    const [row] = await knex('sales')
        .whereNull('voided_at')
        .where('created_at', '>=', from)
        .where('created_at', '<=', to)
        .select(
            knex.raw('COALESCE(SUM(vat_amount), 0) as vat'),
            knex.raw('COALESCE(SUM(nhil_amount), 0) as nhil'),
            knex.raw('COALESCE(SUM(getfund_amount), 0) as getfund'),
            knex.raw('COALESCE(SUM(covid_levy_amount), 0) as covid_levy'),
            knex.raw('COALESCE(SUM(levy_amount), 0) as levy'),
        );

    const vat        = Number(row.vat);
    const nhil       = Number(row.nhil);
    const getfund    = Number(row.getfund);
    const covidLevy  = Number(row.covid_levy);
    const levy       = Number(row.levy);

    return {
        period,
        from:     from.toISOString().slice(0, 10),
        to:       to.toISOString().slice(0, 10),
        vat,
        nhil,
        getfund,
        covidLevy,
        levy,
        totalTax: vat + nhil + getfund + covidLevy + levy,
    };
}

export async function getStockMovements(period: Period, date?: string, limitN = 50) {
    const { from, to } = resolvePeriod(period, date);

    const [totals] = await knex('stock_entries')
        .where('created_at', '>=', from)
        .where('created_at', '<=', to)
        .select(
            knex.raw("COALESCE(SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END), 0)::int as total_added"),
            knex.raw("COALESCE(SUM(CASE WHEN quantity < 0 THEN -quantity ELSE 0 END), 0)::int as total_removed"),
            knex.raw('COUNT(*)::int as entry_count'),
        );

    const entries = await knex('stock_entries as se')
        .join('product_variants as pv', 'pv.id', 'se.variant_id')
        .join('products as p', 'p.id', 'pv.product_id')
        .join('users as u', 'u.id', 'se.created_by')
        .where('se.created_at', '>=', from)
        .where('se.created_at', '<=', to)
        .select(
            'se.id', 'se.quantity', 'se.note', 'se.created_at',
            'p.name as product_name', 'pv.sku',
            'u.name as staff_name',
        )
        .orderBy('se.created_at', 'desc')
        .limit(limitN);

    return {
        period,
        from:         from.toISOString().slice(0, 10),
        to:           to.toISOString().slice(0, 10),
        totalAdded:   totals.total_added,
        totalRemoved: totals.total_removed,
        entryCount:   totals.entry_count,
        entries: entries.map((row: any) => ({
            id:          row.id,
            productName: row.product_name,
            sku:         row.sku ?? null,
            quantity:    row.quantity,
            note:        row.note ?? null,
            staffName:   row.staff_name,
            createdAt:   row.created_at,
        })),
    };
}

export async function getReturnsReport(period: Period, date?: string) {
    const { from, to } = resolvePeriod(period, date);

    const rows = await knex('sale_returns as sr')
        .join('sale_return_items as sri', 'sri.return_id', 'sr.id')
        .join('sale_items as si', 'si.id', 'sri.sale_item_id')
        .join('users as u', 'u.id', 'sr.processed_by_id')
        .where('sr.created_at', '>=', from)
        .where('sr.created_at', '<=', to)
        .select(
            'sr.id as return_id', 'sr.processed_by_id', 'u.name as staff_name',
            knex.raw('(sri.quantity * si.unit_price) as line_value'),
        );

    const byStaffMap = new Map<string, { staffId: string; staffName: string; count: number; total: number }>();
    const seenReturnIds = new Set<string>();
    const returnIds = new Set<string>();
    let returnTotal = 0;

    for (const row of rows) {
        returnIds.add(row.return_id);
        const value = Number(row.line_value);
        returnTotal += value;

        const existing = byStaffMap.get(row.processed_by_id);
        const isNewReturn = !seenReturnIds.has(row.return_id);
        seenReturnIds.add(row.return_id);

        if (existing) {
            existing.total += value;
            if (isNewReturn) existing.count += 1;
        } else {
            byStaffMap.set(row.processed_by_id, {
                staffId:   row.processed_by_id,
                staffName: row.staff_name,
                count:     isNewReturn ? 1 : 0,
                total:     value,
            });
        }
    }

    return {
        period,
        from:        from.toISOString().slice(0, 10),
        to:          to.toISOString().slice(0, 10),
        returnCount: returnIds.size,
        returnTotal: Number(returnTotal.toFixed(2)),
        byStaff:     Array.from(byStaffMap.values()).map((s) => ({ ...s, total: Number(s.total.toFixed(2)) })),
    };
}

export async function getActivityLog(filters: {
    page:        number;
    limit:       number;
    from?:       string;
    to?:         string;
    userId?:     string;
    action?:     string;
    entityType?: string;
}) {
    const { page, limit, from, to, userId, action, entityType } = filters;
    const offset = (page - 1) * limit;

    let base = knex('audit_logs');
    if (from)       base = base.where('audit_logs.created_at', '>=', from);
    if (to)         base = base.where('audit_logs.created_at', '<=', to + ' 23:59:59');
    if (userId)     base = base.where('audit_logs.user_id', userId);
    if (action)     base = base.where('audit_logs.action', action);
    if (entityType) base = base.where('audit_logs.entity_type', entityType);

    const [logs, countResult] = await Promise.all([
        base.clone()
            .join('users as u', 'u.id', 'audit_logs.user_id')
            .select('audit_logs.id', 'audit_logs.action', 'audit_logs.entity_type', 'audit_logs.entity_id',
                'audit_logs.before', 'audit_logs.after', 'audit_logs.created_at',
                'u.id as user_id', 'u.name as user_name')
            .orderBy('audit_logs.created_at', 'desc')
            .offset(offset)
            .limit(limit),
        base.clone().count('audit_logs.id as count').first(),
    ]);

    return {
        logs: logs.map((row: any) => ({
            id:         row.id,
            action:     row.action,
            entityType: row.entity_type,
            entityId:   row.entity_id,
            before:     row.before,
            after:      row.after,
            createdAt:  row.created_at,
            userId:     row.user_id,
            userName:   row.user_name,
        })),
        total: Number((countResult as any)?.count ?? 0),
        page,
        limit,
    };
}

export async function getSalesReconciliation(from: Date, to: Date) {
    const sales = await knex('sales')
        .whereBetween('created_at', [from.toISOString(), to.toISOString()])
        .whereNull('voided_at')
        .where('payment_status', 'paid')
        .select('id', 'payment_method', 'amount_due', 'discount', 'levy_amount');

    const cashSales = sales.filter((s: any) => s.payment_method === 'cash');
    const momoSales = sales.filter((s: any) => s.payment_method === 'momo');

    const cashTotal     = cashSales.reduce((sum: number, s: any) => sum + Number(s.amount_due), 0);
    const momoTotal     = momoSales.reduce((sum: number, s: any) => sum + Number(s.amount_due), 0);
    const discountTotal = sales.reduce((sum: number, s: any) => sum + Number(s.discount ?? 0), 0);
    const levyTotal     = sales.reduce((sum: number, s: any) => sum + Number(s.levy_amount ?? 0), 0);

    const saleIds = sales.map((s: any) => s.id);
    let cogsTotal  = 0;
    let unitsSold  = 0;
    if (saleIds.length > 0) {
        const itemRows = await knex('sale_items')
            .whereIn('sale_id', saleIds)
            .select(knex.raw('SUM(cost_price_snapshot * quantity) AS cogs'), knex.raw('SUM(quantity) AS units'));
        cogsTotal = parseFloat(Number(itemRows[0]?.cogs ?? 0).toFixed(2));
        unitsSold = parseInt(String(itemRows[0]?.units ?? 0), 10);
    }

    const returnRows = await knex('sale_returns as sr')
        .join('sale_items as si', function () {
            this.on('si.sale_id', '=', 'sr.sale_id');
        })
        .join('sale_return_items as sri', 'sri.sale_item_id', '=', 'si.id')
        .whereBetween('sr.created_at', [from.toISOString(), to.toISOString()])
        .select(knex.raw('sri.quantity * si.unit_price AS line_value'));

    const returnTotal = returnRows.reduce((sum: number, r: any) => sum + Number(r.line_value ?? 0), 0);
    const returnCount = returnRows.length;

    const voidRows = await knex('sales')
        .whereBetween('voided_at', [from.toISOString(), to.toISOString()])
        .whereNotNull('voided_at')
        .select('amount_due');

    const voidTotal = voidRows.reduce((sum: number, v: any) => sum + Number(v.amount_due), 0);
    const voidCount = voidRows.length;

    const totalRevenue      = cashTotal + momoTotal;
    const totalTransactions = sales.length;
    const grossProfit       = parseFloat((totalRevenue - cogsTotal).toFixed(2));
    const netCashExpected   = parseFloat((cashTotal - returnTotal).toFixed(2));

    return {
        cashCount:         cashSales.length,
        cashTotal:         parseFloat(cashTotal.toFixed(2)),
        momoCount:         momoSales.length,
        momoTotal:         parseFloat(momoTotal.toFixed(2)),
        totalRevenue:      parseFloat(totalRevenue.toFixed(2)),
        totalTransactions,
        unitsSold,
        cogsTotal,
        grossProfit:       Math.max(0, grossProfit),
        discountTotal:     parseFloat(discountTotal.toFixed(2)),
        returnCount,
        returnTotal:       parseFloat(returnTotal.toFixed(2)),
        voidCount,
        voidTotal:         parseFloat(voidTotal.toFixed(2)),
        levyTotal:         parseFloat(levyTotal.toFixed(2)),
        netCashExpected:   Math.max(0, netCashExpected),
    };
}

export async function getReconciliation(period: Period, date?: string) {
    const { from, to } = resolvePeriod(period, date);
    const stats = await getSalesReconciliation(from, to);

    return {
        period,
        from: from.toISOString().slice(0, 10),
        to:   to.toISOString().slice(0, 10),
        ...stats,
    };
}
