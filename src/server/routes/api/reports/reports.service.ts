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
