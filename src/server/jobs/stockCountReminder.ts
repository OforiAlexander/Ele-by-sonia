import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { sendMail } from '../services/mail/send-mail';
import logger from '../services/logger';

export async function runStockCountReminder(): Promise<void> {
    await ensureLoaded();

    const rawDays = get(SETTINGS.STOCK_COUNT_REMINDER_DAYS)?.value ?? '0';
    const days = parseInt(rawDays, 10);
    if (!days || days <= 0) return;

    // Send only if today's epoch-day index is divisible by the interval.
    // This gives deterministic, calendar-aligned reminder days without DB state.
    const epochDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    if (epochDay % days !== 0) return;

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
        logger.warn('[stock-reminder] OWNER_EMAIL not set, skipping');
        return;
    }

    const businessName = get(SETTINGS.BUSINESS_NAME)?.value ?? 'Elegance by Sconia';

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;font-size:14px;background:#f4f4f4;margin:0;">
<div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #e0e0e0;">
  <div style="background:#1a1a2e;color:#fff;padding:20px 28px;">
    <h1 style="margin:0;font-size:18px;">${businessName}</h1>
    <p style="margin:4px 0 0;font-size:12px;opacity:0.7;">Stock Count Reminder</p>
  </div>
  <div style="padding:24px 28px;">
    <p>This is your scheduled reminder to perform a physical stock count.</p>
    <p>Regular stock counts help catch discrepancies early and keep your inventory accurate.</p>
    <p style="color:#888;font-size:12px;">Reminder interval: every ${days} day${days !== 1 ? 's' : ''}.</p>
  </div>
</div>
</body>
</html>`;

    await sendMail({
        to:      ownerEmail,
        subject: `Stock Count Reminder — ${businessName}`,
        html,
    });

    logger.info('[stock-reminder] Reminder sent to %s', ownerEmail);
}
