import ProductVariant from '../models/ProductVariant';
import Setting from '../models/Setting';
import { sendMail } from '../services/mail/send-mail';
import { SETTINGS } from '../constants/settings';

export async function runLowStockAlert(): Promise<void> {
  const alertEnabledSetting = await Setting.query().findOne({ name: SETTINGS.LOW_STOCK_ALERT_ENABLED });
  if (alertEnabledSetting?.value !== 'true') return;

  const lowVariants = await ProductVariant.query()
    .whereRaw('stock <= low_stock_threshold')
    .where({ is_active: true })
    .withGraphFetched('product');

  if (lowVariants.length === 0) return;

  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return;

  const rows = lowVariants
    .map((v: any) => {
      const productName = v.product?.name ?? 'Unknown Product';
      return `<tr>
        <td>${productName}</td>
        <td>${v.size ?? '—'}</td>
        <td>${v.colour ?? '—'}</td>
        <td>${v.stock}</td>
        <td>${v.low_stock_threshold}</td>
      </tr>`;
    })
    .join('');

  const html = `
    <h2>Low Stock Alert Elegance by Sconia</h2>
    <p>The following variants are at or below their low stock threshold:</p>
    <table border="1" cellpadding="6">
      <thead>
        <tr><th>Product</th><th>Size</th><th>Colour</th><th>Stock</th><th>Threshold</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p>Please restock soon.</p>
  `;

  await sendMail({
    to: ownerEmail,
    subject: `Low Stock Alert — ${lowVariants.length} variant(s) need restocking`,
    html,
  });
}
