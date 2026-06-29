import '../models/_config';
import Setting from '../models/Setting';
import { SETTING_DEFINITIONS } from '../constants/settings';
import logger from '../services/logger';

export async function ensureSettings(): Promise<void> {
  logger.info('Syncing settings…');

  for (const def of SETTING_DEFINITIONS) {
    const existing = await Setting.query().findOne({ name: def.name });

    if (!existing) {
      await Setting.query().insert({
        name:     def.name,
        label:    def.label,
        value:    def.value,
        group:    def.group,
        editable: def.editable,
      });
      logger.info(`  + Setting created: ${def.name} = ${def.value}`);
    } else {
      const patch: Record<string, unknown> = {
        label:    def.label,
        group:    def.group,
        editable: def.editable,
      };
      // Non-editable settings are code-owned; enforce the code-defined value on every startup
      if (!def.editable) {
        patch.value = def.value;
      }
      await Setting.query().where({ name: def.name }).patch(patch);
    }
  }

  logger.info('Settings synced.');
}

if (require.main === module) {
  ensureSettings()
    .then(() => process.exit(0))
    .catch((err) => { logger.error(err); process.exit(1); });
}
