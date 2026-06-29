import knex from '../models/_config';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import logger from '../services/logger';

function formatGhs(n: number): string {
    return `GHS ${n.toFixed(2)}`;
}

export async function runMonthlyReport(): Promise<void> {
    await ensureLoaded();

    const enabled = get(SETTINGS.MONTHLY_REPORT_ENABLED)?.value === 'true';
    if (!enabled) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[monthly-report] OWNER_EMAIL not set, skipping');
        return;
    }

    const businessName    = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
    const fiscalStartRaw  = get(SETTINGS.FISCAL_YEAR_START_MONTH)?.value ?? '1';
    const fiscalStartMonth = parseInt(fiscalStartRaw, 10) - 1; // 0-indexed

    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fromDate  = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const toDate    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // YTD: from the start of the current fiscal year
    const yearForFiscal = now.getMonth() >= fiscalStartMonth ? now.getFullYear() : now.getFullYear() - 1;
    const ytdFrom = new Date(yearForFiscal, fiscalStartMonth, 1);

    const [monthSales, ytdSales] = await Promise.all([
        knex('sales')
            .whereBetween('created_at', [fromDate.toISOString(), toDate.toISOString()])
            .whereNull('voided_at')
            .where('payment_status', 'paid')
            .select('id', 'amount_due', 'payment_method'),

        knex('sales')
            .where('created_at', '>=', ytdFrom.toISOString())
            .whereNull('voided_at')
            .where('payment_status', 'paid')
            .count('id as count')
            .sum('amount_due as revenue')
            .first(),
    ]);

    const monthRevenue = monthSales.reduce((s: number, r: any) => s + Number(r.amount_due), 0);
    const monthCount   = monthSales.length;

    const monthSaleIds = monthSales.map((s: any) => s.id);
    let cogs = 0;
    if (monthSaleIds.length > 0) {
        const cogsRow = await knex('sale_items')
            .whereIn('sale_id', monthSaleIds)
            .select(knex.raw('SUM(cost_price_snapshot * quantity) AS cogs'))
            .first() as { cogs: string | null } | undefined;
        cogs = parseFloat(Number(cogsRow?.cogs ?? 0).toFixed(2));
    }

    const grossProfit  = Math.max(0, parseFloat((monthRevenue - cogs).toFixed(2)));
    const ytdRevenue   = parseFloat(Number(ytdSales?.revenue ?? 0).toFixed(2));
    const ytdCount     = Number(ytdSales?.count ?? 0);

    const monthLabel   = fromDate.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
    const ytdFromLabel = ytdFrom.toLocaleDateString('en-GH', { month: 'short', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: #f4f4f4; margin: 0; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border: 1px solid #e0e0e0; }
  .header { background: #1a1a2e; color: #fff; padding: 22px 30px; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.7; }
  .section { padding: 22px 30px; border-bottom: 1px solid #eee; }
  .section-title { font-size: 11px; font-weight: bold; letter-spacing: 1.2px; text-transform: uppercase; color: #777; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 7px 0; color: #555; }
  td.val { text-align: right; font-weight: bold; color: #1a1a1a; }
  .divider td { border-top: 1px solid #eee; padding-top: 10px; }
  .profit td { color: #27ae60; }
  .footer { padding: 16px 30px; background: #f8f8f8; font-size: 11px; color: #aaa; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${businessName}</h1>
    <p>Monthly P&amp;L Report &nbsp;&middot;&nbsp; ${monthLabel}</p>
  </div>

  <div class="section">
    <p class="section-title">Revenue</p>
    <table>
      <tr><td>Total Revenue</td><td class="val">${formatGhs(monthRevenue)}</td></tr>
      <tr><td>Transactions</td><td class="val">${monthCount}</td></tr>
      <tr><td>Cost of Goods Sold</td><td class="val" style="color:#c0392b;">${formatGhs(cogs)}</td></tr>
      <tr class="divider profit"><td>Gross Profit</td><td class="val" style="color:#27ae60;">${formatGhs(grossProfit)}</td></tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Year-to-Date (${ytdFromLabel} – now)</p>
    <table>
      <tr><td>YTD Revenue</td><td class="val">${formatGhs(ytdRevenue)}</td></tr>
      <tr><td>YTD Transactions</td><td class="val">${ytdCount}</td></tr>
    </table>
  </div>

  <div class="footer">
    Automated monthly report &nbsp;&middot;&nbsp; ${businessName}
  </div>
</div>
</body>
</html>`;

    await sendMail({
        to:      ownerEmail,
        subject: `Monthly P&L Report — ${monthLabel} [${businessName}]`,
        html,
    });

    logger.info('[monthly-report] Sent for %s', monthLabel);
}
