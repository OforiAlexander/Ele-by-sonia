import schedule from 'node-schedule';
import { runLowStockAlert } from './low-stock-alert';
import logger from '../services/logger';

export function registerJobs(): void {
  // Daily at 7:00 AM — check variants below low-stock threshold and email the owner
  schedule.scheduleJob('0 7 * * *', async () => {
    logger.info('Running low stock alert job…');
    await runLowStockAlert().catch((err) => logger.error('Low stock alert failed:', err));
  });

  logger.info('Background jobs registered.'); // TODO: WRITE A SCHEDULER THAT ALEATS THE OWBER WEEKLY AMOUNT EARNED, STOCK RECPORT AND OTHER ANALYTICS
}
