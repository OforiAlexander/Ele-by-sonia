export interface MissingImageProduct {
    name:     string;
    category: string;
}

export interface MissingImagesData {
    businessName: string;
    logoUrl:      string;
    products:     MissingImageProduct[];
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
  .intro { font-size: 14px; color: #444; line-height: 1.6; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #f8f8f8; }
  th { padding: 9px 10px; text-align: left; font-size: 11px; font-weight: bold; letter-spacing: 0.8px; text-transform: uppercase; color: #888; border-bottom: 1px solid #e8e8e8; }
  td { padding: 10px 10px; border-bottom: 1px solid #f2f2f2; vertical-align: middle; }
  .footer { padding: 16px 0 0; font-size: 12px; color: #aaa; text-align: center; }
`;

function formatDate(d: Date): string {
    return d.toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function buildMissingImagesHtml(data: MissingImagesData): string {
    const rows = data.products.map((p) => `
      <tr>
        <td>${p.name}</td>
        <td style="color:#888;">${p.category}</td>
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
      <h2>Products Missing Images — ${data.businessName}</h2>
      <p>${data.products.length} product${data.products.length === 1 ? '' : 's'} &nbsp;·&nbsp; ${formatDate(data.generatedAt)}</p>
    </div>
    <div class="card-body">
      <p class="intro">
        ${data.products.length} product${data.products.length === 1 ? '' : 's'} ${data.products.length === 1 ? 'is' : 'are'} missing
        images. Adding images helps customers make purchasing decisions on your online store.
      </p>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>
  <div class="footer">${data.businessName} &nbsp;·&nbsp; This is an automated weekly reminder</div>
</div>
</body>
</html>`;
}
