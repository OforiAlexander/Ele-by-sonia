import knex from '../models/_config';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import { buildEodReportHtml, buildWeeklyReportHtml } from '../services/mail/templates/eod-report';
import type { EodReportData, WeeklyReportData } from '../services/mail/templates/eod-report';
import logger from '../services/logger';

async function collectSalesData(from: Date, to: Date) {
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

    // Cost of goods sold: cost_price_snapshot × quantity for every item on paid sales in this window
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

export async function runEodReconciliation(): Promise<void> {
    await ensureLoaded();

    const enabled = get(SETTINGS.EOD_REPORT_ENABLED)?.value === 'true';
    if (!enabled) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[eod] OWNER_EMAIL not set, skipping report');
        return;
    }

    const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const stats = await collectSalesData(startOfDay, now);

    const reportDate = new Date(now);
    reportDate.setHours(0, 0, 0, 0);

    const data: EodReportData = {
        businessName,
        reportDate,
        generatedAt: now,
        ...stats,
    };

    const html = buildEodReportHtml(data);
    const dateLabel = reportDate.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

    await sendMail({
        to:      ownerEmail,
        subject: `Daily Sales Summary — ${dateLabel}`,
        html,
    });

    logger.info('[eod] Daily report sent to %s for %s', ownerEmail, dateLabel);
}

export async function runWeeklyReconciliation(): Promise<void> {
    await ensureLoaded();

    const enabled = get(SETTINGS.EOD_REPORT_ENABLED)?.value === 'true';
    if (!enabled) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[eod] OWNER_EMAIL not set, skipping weekly report');
        return;
    }

    const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const stats = await collectSalesData(periodStart, now);

    const data: WeeklyReportData = {
        businessName,
        reportDate: now,
        periodStart,
        periodEnd,
        generatedAt: now,
        ...stats,
    };

    const html = buildWeeklyReportHtml(data);
    const rangeLabel = `${periodStart.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} – ${periodEnd.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    await sendMail({
        to:      ownerEmail,
        subject: `Weekly Sales Report — ${rangeLabel}`,
        html,
    });

    logger.info('[eod] Weekly report sent to %s for %s', ownerEmail, rangeLabel);
}
