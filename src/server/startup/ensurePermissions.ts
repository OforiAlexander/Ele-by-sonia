import '../models/_config';
import Permission from '../models/Permission';
import { PERMISSION_DEFINITIONS } from '../constants/permissions';
import logger from '../services/logger';

export async function ensurePermissions(): Promise<void> {
  logger.info('Syncing permissions…');

  for (const def of PERMISSION_DEFINITIONS) {
    const existing = await Permission.query().findOne({ name: def.name });

    if (!existing) {
      await Permission.query().insert({
        name: def.name,
        label: def.label,
        resource: def.resource,
        is_sensitive: def.is_sensitive,
        enabled: true,
      });
      logger.info(`  + Permission created: ${def.name}`);
    } else if (!existing.enabled) {
      await Permission.query().patchAndFetchById(existing.id, { enabled: true });
      logger.info(`  ↑ Permission re-enabled: ${def.name}`);
    }
  }

  // Disable permissions that no longer exist in code
  const codeNames = PERMISSION_DEFINITIONS.map((d) => d.name);
  const allInDb = await Permission.query().where({ enabled: true });

  for (const perm of allInDb) {
    if (!codeNames.includes(perm.name as never)) {
      await Permission.query().patchAndFetchById(perm.id, { enabled: false });
      logger.info(`  - Permission disabled (removed from code): ${perm.name}`);
    }
  }

  logger.info('Permissions synced.');
}

// Allows running as a standalone CLI script
if (require.main === module) {
  ensurePermissions()
    .then(() => process.exit(0))
    .catch((err) => { logger.error(err); process.exit(1); });
}
