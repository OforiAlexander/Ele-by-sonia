import ProductVariant from '../models/ProductVariant';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import logger from '../services/logger';

function parseRecipients(raw: string): string {
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ');
}

export async function runLowStockAlert(): Promise<void> {
    await ensureLoaded();

    const alertEnabled = get(SETTINGS.LOW_STOCK_ALERT_ENABLED)?.value === 'true';
    if (!alertEnabled) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[low-stock] OWNER_EMAIL not set, skipping alert');
        return;
    }

    const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
    const extraRecipients = parseRecipients(get(SETTINGS.LOW_STOCK_ALERT_RECIPIENTS)?.value ?? '');

    const lowVariants = await ProductVariant.query()
        .whereRaw('stock <= low_stock_threshold')
        .where({ is_active: true })
        .withGraphFetched('product');

    if (lowVariants.length === 0) return;

    const rows = lowVariants
        .map((v: any) => {
            const productName = v.product?.name ?? 'Unknown Product';
            return `<tr>
        <td style="padding:6px 10px;border:1px solid #ddd;">${productName}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${v.sku ?? '—'}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${v.stock}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${v.low_stock_threshold}</td>
      </tr>`;
        })
        .join('');

    const html = `
    <h2 style="color:#1a1a1a;">Low Stock Alert — ${businessName}</h2>
    <p>The following variants are at or below their low-stock threshold and need restocking:</p>
    <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Product</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">SKU</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Stock</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Threshold</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;color:#666;">Please restock soon to avoid selling out.</p>
  `;

    await sendMail({
        to:      ownerEmail,
        cc:      extraRecipients || undefined,
        subject: `Low Stock Alert — ${lowVariants.length} variant(s) need restocking`,
        html,
    });

    logger.info('[low-stock] Alert sent to %s for %d variant(s)', ownerEmail, lowVariants.length);
}
