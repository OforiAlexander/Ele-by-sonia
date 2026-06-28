function formatGhs(amount: number): string {
    return `GHS ${amount.toFixed(2)}`;
}

function formatDate(d: Date): string {
    return d.toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateRange(from: Date, to: Date): string {
    return `${from.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const baseStyles = `
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: #f4f4f4; margin: 0; padding: 0; }
  .wrapper { max-width: 620px; margin: 32px auto; background: #fff; border: 1px solid #e0e0e0; }
  .header { background: #1a1a2e; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0 0 4px; font-size: 20px; letter-spacing: 0.5px; }
  .header p { margin: 0; font-size: 13px; opacity: 0.75; }
  .section { padding: 24px 32px; border-bottom: 1px solid #e8e8e8; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 11px; font-weight: bold; letter-spacing: 1.2px; text-transform: uppercase; color: #666; margin: 0 0 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 0; vertical-align: top; }
  td.label { color: #555; width: 60%; }
  td.amount { text-align: right; font-weight: bold; color: #1a1a1a; }
  td.count { text-align: right; color: #888; font-size: 12px; padding-left: 12px; }
  .divider td { border-top: 1px solid #e0e0e0; padding-top: 12px; }
  .total-row td { font-size: 16px; font-weight: bold; }
  .net-box { background: #f8f8f8; border: 1px solid #e0e0e0; padding: 16px 20px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
  .net-label { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 0.8px; }
  .net-amount { font-size: 22px; font-weight: bold; color: #1a1a2e; }
  .footer { padding: 20px 32px; background: #f8f8f8; font-size: 12px; color: #888; }
`;

export interface EodReportData {
    businessName:      string;
    reportDate:        Date;
    cashCount:         number;
    cashTotal:         number;
    momoCount:         number;
    momoTotal:         number;
    totalRevenue:      number;
    totalTransactions: number;
    unitsSold:         number;
    cogsTotal:         number;
    grossProfit:       number;
    discountTotal:     number;
    returnCount:       number;
    returnTotal:       number;
    voidCount:         number;
    voidTotal:         number;
    levyTotal:         number;
    netCashExpected:   number;
    generatedAt:       Date;
}

export interface WeeklyReportData extends EodReportData {
    periodStart: Date;
    periodEnd:   Date;
}

export function buildEodReportHtml(data: EodReportData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${baseStyles}</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${data.businessName}</h1>
    <p>End-of-Day Sales Report &nbsp;&middot;&nbsp; ${formatDate(data.reportDate)}</p>
  </div>

  <div class="section">
    <p class="section-title">Sales Summary</p>
    <table>
      <tr>
        <td class="label">Cash Sales</td>
        <td class="amount">${formatGhs(data.cashTotal)}</td>
        <td class="count">${data.cashCount} transaction${data.cashCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="label">Mobile Money</td>
        <td class="amount">${formatGhs(data.momoTotal)}</td>
        <td class="count">${data.momoCount} transaction${data.momoCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr class="divider">
        <td class="label total-row">Total Revenue</td>
        <td class="amount total-row">${formatGhs(data.totalRevenue)}</td>
        <td class="count">${data.totalTransactions} transaction${data.totalTransactions !== 1 ? 's' : ''} &middot; ${data.unitsSold} unit${data.unitsSold !== 1 ? 's' : ''}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Profitability</p>
    <table>
      <tr>
        <td class="label">Cost of Goods Sold</td>
        <td class="amount" style="color:#c0392b;">${formatGhs(data.cogsTotal)}</td>
        <td class="count">${data.unitsSold} unit${data.unitsSold !== 1 ? 's' : ''}</td>
      </tr>
      <tr class="divider">
        <td class="label total-row">Gross Profit</td>
        <td class="amount total-row" style="color:#27ae60;">${formatGhs(data.grossProfit)}</td>
        <td class="count"></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Deductions</p>
    <table>
      <tr>
        <td class="label">Discounts Applied</td>
        <td class="amount" style="color:#c0392b;">${data.discountTotal > 0 ? '&minus; ' : ''}${formatGhs(data.discountTotal)}</td>
        <td class="count"></td>
      </tr>
      <tr>
        <td class="label">Returns Processed</td>
        <td class="amount" style="color:#c0392b;">${data.returnTotal > 0 ? '&minus; ' : ''}${formatGhs(data.returnTotal)}</td>
        <td class="count">${data.returnCount} return${data.returnCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="label">Voided Sales</td>
        <td class="amount" style="color:#c0392b;">${data.voidTotal > 0 ? '&minus; ' : ''}${formatGhs(data.voidTotal)}</td>
        <td class="count">${data.voidCount} void${data.voidCount !== 1 ? 's' : ''}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Net Cash Expected in Drawer</p>
    <div class="net-box">
      <span class="net-label">Cash to collect at close</span>
      <span class="net-amount">${formatGhs(data.netCashExpected)}</span>
    </div>
  </div>

  ${data.levyTotal > 0 ? `
  <div class="section">
    <p class="section-title">Inventory Levy (Internal)</p>
    <table>
      <tr>
        <td class="label">Total Levy Accrued Today</td>
        <td class="amount">${formatGhs(data.levyTotal)}</td>
        <td class="count"></td>
      </tr>
    </table>
  </div>` : ''}

  <div class="footer">
    Report generated ${data.generatedAt.toLocaleString('en-GH', { timeZone: 'Africa/Accra' })} &nbsp;&middot;&nbsp; ${data.businessName}
  </div>
</div>
</body>
</html>`;
}

export function buildWeeklyReportHtml(data: WeeklyReportData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${baseStyles}</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${data.businessName}</h1>
    <p>Weekly Sales Report &nbsp;&middot;&nbsp; ${formatDateRange(data.periodStart, data.periodEnd)}</p>
  </div>

  <div class="section">
    <p class="section-title">Sales Summary (7 Days)</p>
    <table>
      <tr>
        <td class="label">Cash Sales</td>
        <td class="amount">${formatGhs(data.cashTotal)}</td>
        <td class="count">${data.cashCount} transaction${data.cashCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="label">Mobile Money</td>
        <td class="amount">${formatGhs(data.momoTotal)}</td>
        <td class="count">${data.momoCount} transaction${data.momoCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr class="divider">
        <td class="label total-row">Total Revenue</td>
        <td class="amount total-row">${formatGhs(data.totalRevenue)}</td>
        <td class="count">${data.totalTransactions} transaction${data.totalTransactions !== 1 ? 's' : ''} &middot; ${data.unitsSold} unit${data.unitsSold !== 1 ? 's' : ''}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Profitability</p>
    <table>
      <tr>
        <td class="label">Cost of Goods Sold</td>
        <td class="amount" style="color:#c0392b;">${formatGhs(data.cogsTotal)}</td>
        <td class="count">${data.unitsSold} unit${data.unitsSold !== 1 ? 's' : ''}</td>
      </tr>
      <tr class="divider">
        <td class="label total-row">Gross Profit</td>
        <td class="amount total-row" style="color:#27ae60;">${formatGhs(data.grossProfit)}</td>
        <td class="count"></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Deductions</p>
    <table>
      <tr>
        <td class="label">Discounts Applied</td>
        <td class="amount" style="color:#c0392b;">${data.discountTotal > 0 ? '&minus; ' : ''}${formatGhs(data.discountTotal)}</td>
        <td class="count"></td>
      </tr>
      <tr>
        <td class="label">Returns Processed</td>
        <td class="amount" style="color:#c0392b;">${data.returnTotal > 0 ? '&minus; ' : ''}${formatGhs(data.returnTotal)}</td>
        <td class="count">${data.returnCount} return${data.returnCount !== 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td class="label">Voided Sales</td>
        <td class="amount" style="color:#c0392b;">${data.voidTotal > 0 ? '&minus; ' : ''}${formatGhs(data.voidTotal)}</td>
        <td class="count">${data.voidCount} void${data.voidCount !== 1 ? 's' : ''}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p class="section-title">Net Cash for the Week</p>
    <div class="net-box">
      <span class="net-label">Cash collected (excl. Momo)</span>
      <span class="net-amount">${formatGhs(data.netCashExpected)}</span>
    </div>
  </div>

  ${data.levyTotal > 0 ? `
  <div class="section">
    <p class="section-title">Inventory Levy (Internal)</p>
    <table>
      <tr>
        <td class="label">Total Levy Accrued This Week</td>
        <td class="amount">${formatGhs(data.levyTotal)}</td>
        <td class="count"></td>
      </tr>
    </table>
  </div>` : ''}

  <div class="footer">
    Report generated ${data.generatedAt.toLocaleString('en-GH', { timeZone: 'Africa/Accra' })} &nbsp;&middot;&nbsp; ${data.businessName}
  </div>
</div>
</body>
</html>`;
}
