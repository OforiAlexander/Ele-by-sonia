import schedule from 'node-schedule';
import { runLowStockAlert } from './low-stock-alert';
import { expirePendingMomoSales } from './expirePendingMomoSales';
import { runEodReconciliation, runWeeklyReconciliation } from './eodReconciliation';
import logger from '../services/logger';

export function registerJobs(): void {
    schedule.scheduleJob('0 7 * * *', async () => {
        logger.info('Running low stock alert job');
        await runLowStockAlert().catch((err) => logger.error('Low stock alert failed:', err));
    });

    schedule.scheduleJob('*/10 * * * *', async () => {
        await expirePendingMomoSales().catch((err) => logger.error('Momo expiry job failed:', err));
    });

    schedule.scheduleJob('0 22 * * *', async () => {
        logger.info('Running EOD reconciliation');
        await runEodReconciliation().catch((err) => logger.error('EOD reconciliation failed:', err));
    });

    schedule.scheduleJob('0 22 * * 0', async () => {
        logger.info('Running weekly reconciliation');
        await runWeeklyReconciliation().catch((err) => logger.error('Weekly reconciliation failed:', err));
    });

    logger.info('Background jobs registered');
}
