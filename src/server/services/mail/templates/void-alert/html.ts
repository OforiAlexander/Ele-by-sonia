export interface VoidAlertData {
    businessName: string;
    logoUrl:      string;
    saleRef:      string;
    amount:       number;
    currency:     string;
    voidedBy:     string;
    voidedAt:     Date;
    reason?:      string;
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
  .field-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #f2f2f2; font-size: 13px; }
  .field-row:last-child { border-bottom: none; }
  .field-label { color: #888; }
  .field-value { font-weight: 600; color: #1a1a1a; }
  .amount-row .field-value { font-size: 16px; color: #c0392b; }
  .reason-box { margin-top: 16px; background: #fff8e1; border: 1px solid #ffe0a0; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #7a5c00; }
  .reason-box strong { display: block; margin-bottom: 4px; }
  .footer { padding: 16px 0 0; font-size: 12px; color: #aaa; text-align: center; }
`;

function formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
}

function formatDate(d: Date): string {
    return d.toLocaleString('en-GH', { timeZone: 'Africa/Accra', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function buildVoidAlertHtml(data: VoidAlertData): string {
    const reasonBlock = data.reason
        ? `<div class="reason-box"><strong>Reason given:</strong>${data.reason}</div>`
        : '';

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
      <h2>Sale Voided — ${data.businessName}</h2>
      <p>A sale has been reversed. Review the details below.</p>
    </div>
    <div class="card-body">
      <div class="field-row">
        <span class="field-label">Sale Reference</span>
        <span class="field-value">${data.saleRef}</span>
      </div>
      <div class="field-row amount-row">
        <span class="field-label">Voided Amount</span>
        <span class="field-value">${formatAmount(data.amount, data.currency)}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Voided By</span>
        <span class="field-value">${data.voidedBy}</span>
      </div>
      <div class="field-row">
        <span class="field-label">Voided At</span>
        <span class="field-value">${formatDate(data.voidedAt)}</span>
      </div>
      ${reasonBlock}
    </div>
  </div>
  <div class="footer">${data.businessName} &nbsp;·&nbsp; This is an automated void alert</div>
</div>
</body>
</html>`;
}
