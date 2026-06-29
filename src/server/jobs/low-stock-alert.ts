import ProductVariant from '../models/ProductVariant';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import { buildLowStockAlertHtml } from '../services/mail/templates/low-stock-alert';
import { notifyStockAlertIfNew, NOTIF_TYPES } from '../services/notifications/notify';
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
    const logoUrl      = `${process.env.BASE_URL}/images/logo.png`;
    const extraRecipients = parseRecipients(get(SETTINGS.LOW_STOCK_ALERT_RECIPIENTS)?.value ?? '');

    const lowVariants = await ProductVariant.query()
        .whereRaw('stock <= low_stock_threshold')
        .where({ is_active: true })
        .withGraphFetched('product');

    if (lowVariants.length === 0) return;

    const items = lowVariants.map((v: any) => ({
        product_name: v.product?.name ?? 'Unknown Product',
        sku:          v.sku ?? null,
        stock:        Number(v.stock),
        threshold:    Number(v.low_stock_threshold),
        is_out:       Number(v.stock) <= 0,
    }));

    const html = buildLowStockAlertHtml({ businessName, logoUrl, items, generatedAt: new Date() });

    await sendMail({
        to:      ownerEmail,
        cc:      extraRecipients || undefined,
        subject: `Low Stock Alert — ${lowVariants.length} variant(s) need restocking`,
        html,
    });

    for (const v of lowVariants as any[]) {
        const isOut = Number(v.stock) <= 0;
        const type  = isOut ? NOTIF_TYPES.OUT_OF_STOCK : NOTIF_TYPES.LOW_STOCK;
        const title = isOut
            ? `Out of stock: ${v.product?.name ?? 'Unknown'}`
            : `Low stock: ${v.product?.name ?? 'Unknown'} (${v.stock} left)`;
        await notifyStockAlertIfNew('stock.view', v.id, { type, title, data: { variant_id: v.id } }).catch(
            (err: any) => logger.error('[low-stock] notify failed for variant %s: %s', v.id, err.message),
        );
    }

    logger.info('[low-stock] Alert sent to %s for %d variant(s)', ownerEmail, lowVariants.length);
}
