export interface LowStockItem {
    product_name: string;
    sku:          string | null;
    stock:        number;
    threshold:    number;
    is_out:       boolean;
}

export interface LowStockAlertData {
    businessName: string;
    logoUrl:      string;
    items:        LowStockItem[];
    generatedAt:  Date;
}

const baseStyles = `
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 32px auto; }
  .logo-row { text-align: center; padding: 0 0 24px; }
  .logo-row img { height: 56px; width: auto; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
  .card-header { padding: 20px 28px 16px; border-bottom: 1px solid #f0f0f0; }
  .card-header h2 { margin: 0 0 4px; font-size: 17px; color: #1a1a1a; }
  .card-header p { margin: 0; font-size: 13px; color: #888; }
  .card-body { padding: 20px 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #f8f8f8; }
  th { padding: 9px 10px; text-align: left; font-size: 11px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; color: #888; border-bottom: 1px solid #e8e8e8; }
  td { padding: 10px 10px; border-bottom: 1px solid #f2f2f2; vertical-align: middle; }
  .badge-out { display: inline-block; background: #fee2e2; color: #c0392b; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; }
  .badge-low { display: inline-block; background: #fff3cd; color: #856404; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; }
  .footer { padding: 16px 0 0; font-size: 12px; color: #aaa; text-align: center; }
`;

function formatDate(d: Date): string {
    return d.toLocaleString('en-GH', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function buildLowStockAlertHtml(data: LowStockAlertData): string {
    const outCount = data.items.filter((i) => i.is_out).length;
    const lowCount = data.items.filter((i) => !i.is_out).length;

    const subtitle = [
        outCount > 0 ? `${outCount} out of stock` : '',
        lowCount > 0 ? `${lowCount} running low` : '',
    ].filter(Boolean).join(' · ');

    const rows = data.items.map((item) => `
      <tr>
        <td>${item.product_name}</td>
        <td style="color:#888;">${item.sku ?? '—'}</td>
        <td><strong style="color:${item.is_out ? '#c0392b' : '#1a1a1a'};">${item.stock}</strong></td>
        <td style="color:#888;">${item.threshold}</td>
        <td>${item.is_out
            ? '<span class="badge-out">Out of stock</span>'
            : '<span class="badge-low">Low stock</span>'}
        </td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>${baseStyles}</style></head>
<body>
<div class="wrapper">
  <div class="logo-row">
    <img src="${data.logoUrl}" alt="${data.businessName} logo" />
  </div>
  <div class="card">
    <div class="card-header">
      <h2>Stock Alert — ${data.businessName}</h2>
      <p>${subtitle} &nbsp;·&nbsp; ${formatDate(data.generatedAt)}</p>
    </div>
    <div class="card-body">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Stock</th>
            <th>Threshold</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <div class="footer">${data.businessName} &nbsp;·&nbsp; This is an automated stock alert</div>
</div>
</body>
</html>`;
}
