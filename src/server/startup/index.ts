import knex from '../models/_config';
import { ensurePermissions } from './ensurePermissions';
import { ensureSettings } from './ensureSettings';
import { ensureOwnerAccount } from './ensureOwnerAccount';
import { ensureDefaultRoles } from './ensureDefaultRoles';
import { get } from './settingsCache';
import { SETTINGS } from '../constants/settings';
import { registerJobs } from '../jobs/scheduler';
import logger from '../services/logger';

export async function runStartupSetup(): Promise<void> {
  logger.info('Connecting to PostgreSQL…');
  await knex.raw('SELECT 1');
  logger.info('PostgreSQL connected.');

  logger.info('Running migrations…');
  await knex.migrate.latest();
  logger.info('Migrations complete.');

  await ensurePermissions();
  await ensureSettings();
  await ensureOwnerAccount();
  await ensureDefaultRoles();
}

export function getSessionMaxAgeMs(): number {
  const raw = get(SETTINGS.SESSION_TIMEOUT_MINUTES)?.value ?? '480';
  const minutes = parseInt(raw, 10);
  const safe = !isNaN(minutes) && minutes >= 5 ? minutes : 480;
  return safe * 60 * 1000;
}

export async function runStartupSequence(startServer: () => void): Promise<void> {
  await runStartupSetup();
  await registerJobs();
  startServer();
}
