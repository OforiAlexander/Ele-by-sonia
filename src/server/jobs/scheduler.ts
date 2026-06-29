import schedule from 'node-schedule';
import { ensureLoaded, get } from '../startup/settingsCache';
import { SETTINGS } from '../constants/settings';
import { runLowStockAlert } from './low-stock-alert';
import { expirePendingMomoSales } from './expirePendingMomoSales';
import { runEodReconciliation, runWeeklyReconciliation } from './eodReconciliation';
import { runDailyOpeningEmail } from './dailyOpeningEmail';
import { runMonthlyReport } from './monthlyReport';
import { runStockCountReminder } from './stockCountReminder';
import { runCleanupNotifications } from './cleanup-notifications';
import { runMissingImagesReminder } from './missing-images-reminder';
import logger from '../services/logger';

const DAY_NAMES: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
};

function parseCronTime(hhmm: string): { hour: number; minute: number } {
    const [hStr, mStr] = hhmm.split(':');
    const hour   = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);
    const safeH  = !isNaN(hour)   && hour   >= 0 && hour   <= 23 ? hour   : 22;
    const safeM  = !isNaN(minute) && minute >= 0 && minute <= 59 ? minute : 0;
    return { hour: safeH, minute: safeM };
}

function parseWeeklyDay(raw: string): number {
    const lower = raw.toLowerCase().trim();
    if (lower in DAY_NAMES) return DAY_NAMES[lower];
    const n = parseInt(lower, 10);
    return !isNaN(n) && n >= 0 && n <= 6 ? n : 0;
}

export async function registerJobs(): Promise<void> {
    await ensureLoaded();

    const eodTimeSetting = get(SETTINGS.EOD_REPORT_TIME)?.value ?? '22:00';
    const { hour: eodHour, minute: eodMin } = parseCronTime(eodTimeSetting);

    const openingTimeSetting = get(SETTINGS.DAILY_OPENING_EMAIL_TIME)?.value ?? '07:00';
    const { hour: openHour, minute: openMin } = parseCronTime(openingTimeSetting);

    const weeklyDayRaw = get(SETTINGS.WEEKLY_REPORT_DAY)?.value ?? 'sunday';
    const weeklyDow    = parseWeeklyDay(weeklyDayRaw);

    schedule.scheduleJob('0 7 * * *', async () => {
        logger.info('Running low stock alert job');
        await runLowStockAlert().catch((err) => logger.error('Low stock alert failed:', err));
    });

    schedule.scheduleJob('*/10 * * * *', async () => {
        await expirePendingMomoSales().catch((err) => logger.error('Momo expiry job failed:', err));
    });

    schedule.scheduleJob(`${eodMin} ${eodHour} * * *`, async () => {
        logger.info('Running EOD reconciliation (scheduled at %s)', eodTimeSetting);
        await runEodReconciliation().catch((err) => logger.error('EOD reconciliation failed:', err));
    });

    schedule.scheduleJob(`${eodMin} ${eodHour} * * ${weeklyDow}`, async () => {
        logger.info('Running weekly reconciliation (day %d)', weeklyDow);
        await runWeeklyReconciliation().catch((err) => logger.error('Weekly reconciliation failed:', err));
    });

    schedule.scheduleJob(`${openMin} ${openHour} * * *`, async () => {
        logger.info('Running daily opening email (scheduled at %s)', openingTimeSetting);
        await runDailyOpeningEmail().catch((err) => logger.error('Daily opening email failed:', err));
    });

    // Monthly P&L: 1st of each month at 06:00
    schedule.scheduleJob('0 6 1 * *', async () => {
        logger.info('Running monthly P&L report');
        await runMonthlyReport().catch((err) => logger.error('Monthly report failed:', err));
    });

    // Runs daily; job itself gates on the configured interval
    schedule.scheduleJob('0 8 * * *', async () => {
        await runStockCountReminder().catch((err) => logger.error('Stock count reminder failed:', err));
    });

    // Midnight: purge notifications older than 7 days
    schedule.scheduleJob('0 0 * * *', async () => {
        await runCleanupNotifications().catch((err) => logger.error('Notification cleanup failed:', err));
    });

    // Saturday 09:00: remind owner about products missing images
    schedule.scheduleJob('0 9 * * 6', async () => {
        await runMissingImagesReminder().catch((err) => logger.error('Missing images reminder failed:', err));
    });

    logger.info(
        'Background jobs registered — EOD at %s, opening email at %s, weekly on day %d',
        eodTimeSetting, openingTimeSetting, weeklyDow,
    );
}
