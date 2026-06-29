import knex from '../models/_config';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import { buildMissingImagesHtml } from '../services/mail/templates/missing-images/html';
import logger from '../services/logger';

export async function runMissingImagesReminder(): Promise<void> {
    await ensureLoaded();

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[missing-images] OWNER_EMAIL not set, skipping reminder');
        return;
    }

    const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';
    const logoUrl      = `${process.env.BASE_URL}/images/logo.png`;

    const products = await knex('products as p')
        .leftJoin('product_images as pi', 'pi.product_id', 'p.id')
        .where('p.is_active', true)
        .whereNull('pi.id')
        .select('p.name', 'p.category')
        .orderBy('p.name');

    if (products.length === 0) {
        logger.info('[missing-images] All active products have images — skipping reminder');
        return;
    }

    const html = buildMissingImagesHtml({
        businessName,
        logoUrl,
        products,
        generatedAt: new Date(),
    });

    await sendMail({
        to:      ownerEmail,
        subject: `Products Missing Images — ${businessName}`,
        html,
    });

    logger.info('[missing-images] Reminder sent to %s for %d product(s)', ownerEmail, products.length);
}
