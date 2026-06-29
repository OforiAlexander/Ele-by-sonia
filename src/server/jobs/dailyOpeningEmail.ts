import knex from '../models/_config';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import logger from '../services/logger';

function formatGhs(n: number): string {
    return `GHS ${n.toFixed(2)}`;
}

export async function runDailyOpeningEmail(): Promise<void> {
    await ensureLoaded();

    const enabled = get(SETTINGS.DAILY_OPENING_EMAIL_ENABLED)?.value === 'true';
    if (!enabled) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[opening-email] OWNER_EMAIL not set, skipping');
        return;
    }

    const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';

    const yesterday     = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromStr = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const toStr   = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    const [sales, lowStock, highStock] = await Promise.all([
        knex('sales')
            .whereBetween('created_at', [fromStr, toStr])
            .whereNull('voided_at')
            .where('payment_status', 'paid')
            .select('amount_due'),

        knex('product_variants as pv')
            .join('products as p', 'p.id', 'pv.product_id')
            .where('pv.is_active', true)
            .whereRaw('pv.stock <= pv.low_stock_threshold AND pv.low_stock_threshold > 0')
            .select('p.name as product_name', 'pv.sku', 'pv.stock', 'pv.low_stock_threshold')
            .orderBy('pv.stock', 'asc')
            .limit(10),

        knex('product_variants as pv')
            .join('products as p', 'p.id', 'pv.product_id')
            .where('pv.is_active', true)
            .whereRaw('pv.low_stock_threshold > 0 AND pv.stock > pv.low_stock_threshold * 3')
            .select('p.name as product_name', 'pv.sku', 'pv.stock')
            .orderBy('pv.stock', 'desc')
            .limit(5),
    ]);

    const yesterdayRevenue = sales.reduce((s: number, r: any) => s + Number(r.amount_due), 0);
    const dateLabel = new Date(fromStr).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'long' });

    const lowStockHtml = lowStock.length
        ? `<ul style="margin:4px 0;padding-left:18px;">${lowStock.map((r: any) => `<li>${r.product_name} (SKU: ${r.sku ?? '—'}) — ${r.stock} left (threshold: ${r.low_stock_threshold})</li>`).join('')}</ul>`
        : '<p style="color:#888;">No low-stock items today.</p>';

    const overstockHtml = highStock.length
        ? `<ul style="margin:4px 0;padding-left:18px;">${highStock.map((r: any) => `<li>${r.product_name} (SKU: ${r.sku ?? '—'}) — ${r.stock} units</li>`).join('')}</ul>`
        : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: #f4f4f4; margin: 0; }
  .wrapper { max-width: 580px; margin: 32px auto; background: #fff; border: 1px solid #e0e0e0; }
  .header { background: #1a1a2e; color: #fff; padding: 20px 28px; }
  .header h1 { margin: 0; font-size: 18px; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.7; }
  .body { padding: 24px 28px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 20px 0 8px; }
  .stat { font-size: 28px; font-weight: bold; color: #1a1a2e; }
  .footer { padding: 16px 28px; background: #f8f8f8; font-size: 11px; color: #aaa; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${businessName}</h1>
    <p>Good morning — here's your daily briefing</p>
  </div>
  <div class="body">
    <h2>Yesterday's Revenue — ${dateLabel}</h2>
    <div class="stat">${formatGhs(yesterdayRevenue)}</div>
    <p style="color:#888;font-size:12px;">${sales.length} paid transaction${sales.length !== 1 ? 's' : ''}</p>

    <h2>Low Stock Alerts</h2>
    ${lowStockHtml}

    ${highStock.length ? `<h2>Overstock Heads-Up</h2>${overstockHtml}` : ''}
  </div>
  <div class="footer">
    Automated morning briefing &nbsp;&middot;&nbsp; ${businessName}
  </div>
</div>
</body>
</html>`;

    await sendMail({
        to:      ownerEmail,
        subject: `Morning Briefing — ${dateLabel} [${businessName}]`,
        html,
    });

    logger.info('[opening-email] Morning briefing sent to %s', ownerEmail);
}
