import knex from '../models/_config';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import { buildEodReportHtml, buildWeeklyReportHtml } from '../services/mail/templates/eod-report';
import type { EodReportData, WeeklyReportData, SlowMovingItem, OverstockItem } from '../services/mail/templates/eod-report';
import { getSalesReconciliation } from '../routes/api/reports/reports.service';
import logger from '../services/logger';

async function collectSlowMoving(days: number): Promise<SlowMovingItem[]> {
    if (days <= 0) return [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const rows = await knex('product_variants as pv')
        .join('products as p', 'p.id', 'pv.product_id')
        .leftJoin(
            knex('sale_items as si')
                .join('sales as s', 's.id', 'si.sale_id')
                .where('s.created_at', '>', cutoff)
                .whereNull('s.voided_at')
                .where('s.payment_status', 'paid')
                .select('si.variant_id')
                .as('recent'),
            'recent.variant_id', 'pv.id',
        )
        .whereNull('recent.variant_id')
        .where('pv.stock', '>', 0)
        .where('pv.is_active', true)
        .leftJoin(
            knex('sale_items as si2')
                .join('sales as s2', 's2.id', 'si2.sale_id')
                .whereNull('s2.voided_at')
                .where('s2.payment_status', 'paid')
                .max('s2.created_at as last_sold')
                .select('si2.variant_id')
                .groupBy('si2.variant_id')
                .as('last_sale'),
            'last_sale.variant_id', 'pv.id',
        )
        .select(
            'p.name as product_name',
            'pv.sku',
            'pv.stock',
            'last_sale.last_sold',
        )
        .orderBy('pv.stock', 'desc')
        .limit(20);

    return rows.map((r: any) => ({
        product_name: r.product_name,
        sku:          r.sku ?? '—',
        stock:        Number(r.stock),
        last_sold:    r.last_sold
            ? new Date(r.last_sold).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
            : null,
    }));
}

async function collectOverstock(multiplier: number): Promise<OverstockItem[]> {
    if (multiplier <= 0) return [];

    const rows = await knex('product_variants as pv')
        .join('products as p', 'p.id', 'pv.product_id')
        .where('pv.is_active', true)
        .whereRaw('pv.low_stock_threshold > 0')
        .whereRaw('pv.stock > pv.low_stock_threshold * ?', [multiplier])
        .select('p.name as product_name', 'pv.sku', 'pv.stock', 'pv.low_stock_threshold as threshold')
        .orderByRaw('pv.stock / pv.low_stock_threshold desc')
        .limit(20);

    return rows.map((r: any) => ({
        product_name: r.product_name,
        sku:          r.sku ?? '—',
        stock:        Number(r.stock),
        threshold:    Number(r.threshold),
    }));
}

function parseRecipients(raw: string): string {
    return raw.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
}

function getReportToggles() {
    return {
        showCogs:  get(SETTINGS.REPORT_INCLUDE_COGS)?.value !== 'false',
        showLevy:  get(SETTINGS.REPORT_INCLUDE_LEVY)?.value !== 'false',
        slowDays:  parseInt(get(SETTINGS.SLOW_MOVING_DAYS_THRESHOLD)?.value ?? '30', 10),
        overstockMult: parseFloat(get(SETTINGS.OVERSTOCK_MULTIPLIER)?.value ?? '0'),
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

    const businessName    = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
    const businessTagline = get(SETTINGS.BUSINESS_TAGLINE)?.value ?? '';
    const extraRecipients = parseRecipients(get(SETTINGS.EOD_REPORT_RECIPIENTS)?.value ?? '');
    const { showCogs, showLevy, slowDays, overstockMult } = getReportToggles();

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [stats, slowMoving, overstock] = await Promise.all([
        getSalesReconciliation(startOfDay, now),
        collectSlowMoving(slowDays),
        collectOverstock(overstockMult),
    ]);

    const reportDate = new Date(now);
    reportDate.setHours(0, 0, 0, 0);

    const data: EodReportData = {
        businessName,
        businessTagline: businessTagline || undefined,
        reportDate,
        generatedAt: now,
        showCogs,
        showLevy,
        slowMoving,
        overstock,
        ...stats,
    };

    const html = buildEodReportHtml(data);
    const dateLabel = reportDate.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });

    await sendMail({
        to:      ownerEmail,
        cc:      extraRecipients || undefined,
        subject: `Daily Sales Summary — ${dateLabel}`,
        html,
    });

    logger.info('[eod] Daily report sent to %s for %s', ownerEmail, dateLabel);
}

export async function runWeeklyReconciliation(): Promise<void> {
    await ensureLoaded();

    // Weekly report has its own enable gate — decoupled from daily EOD
    const enabled = get(SETTINGS.WEEKLY_REPORT_ENABLED)?.value === 'true';
    if (!enabled) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[eod] OWNER_EMAIL not set, skipping weekly report');
        return;
    }

    const businessName    = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
    const businessTagline = get(SETTINGS.BUSINESS_TAGLINE)?.value ?? '';
    const extraRecipients = parseRecipients(get(SETTINGS.EOD_REPORT_RECIPIENTS)?.value ?? '');
    const { showCogs, showLevy, slowDays, overstockMult } = getReportToggles();

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 6);
    periodStart.setHours(0, 0, 0, 0);

    const [stats, slowMoving, overstock] = await Promise.all([
        getSalesReconciliation(periodStart, now),
        collectSlowMoving(slowDays),
        collectOverstock(overstockMult),
    ]);

    const data: WeeklyReportData = {
        businessName,
        businessTagline: businessTagline || undefined,
        reportDate: now,
        periodStart,
        periodEnd,
        generatedAt: now,
        showCogs,
        showLevy,
        slowMoving,
        overstock,
        ...stats,
    };

    const html = buildWeeklyReportHtml(data);
    const rangeLabel = `${periodStart.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} – ${periodEnd.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    await sendMail({
        to:      ownerEmail,
        cc:      extraRecipients || undefined,
        subject: `Weekly Sales Report — ${rangeLabel}`,
        html,
    });

    logger.info('[eod] Weekly report sent to %s for %s', ownerEmail, rangeLabel);
}
