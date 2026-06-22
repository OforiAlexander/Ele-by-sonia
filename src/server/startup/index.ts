import knex from '../models/_config';
import { ensurePermissions } from './ensurePermissions';
import { ensureSettings } from './ensureSettings';
import { ensureOwnerAccount } from './ensureOwnerAccount';
import { ensureDefaultRoles } from './ensureDefaultRoles';
import { registerJobs } from '../jobs/scheduler';
import logger from '../services/logger';

export async function runStartupSequence(startServer: () => void): Promise<void> {
  // 1. Verify PostgreSQL connection
  logger.info('Connecting to PostgreSQL…');
  await knex.raw('SELECT 1');
  logger.info('PostgreSQL connected.');

  // 2. Run pending migrations
  logger.info('Running migrations…');
  await knex.migrate.latest();
  logger.info('Migrations complete.');

  // 3. Sync permissions from code constants
  await ensurePermissions();

  // 4. Sync settings from code constants
  await ensureSettings();

  // 5. Create owner account if it does not exist
  await ensureOwnerAccount();

  // 6. Seed default roles if none exist
  await ensureDefaultRoles();

  // 7. Register background job scheduler
  registerJobs();

  // 8. Start HTTP server
  startServer();
}
