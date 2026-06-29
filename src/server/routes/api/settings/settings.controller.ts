import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as SettingsService from './settings.service';
import { writeAuditLog } from '../../../services/audit/log';
import AuditLog from '../../../models/AuditLog';
import logger from '../../../services/logger';

export async function listPublicSettingsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await SettingsService.listPublicSettings();
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function listSettingsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await SettingsService.listSettings();
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function updateSettingController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name } = req.params;
        const { value } = req.body as { value: string };
        const { updated, oldValue } = await SettingsService.updateSetting(name, value);
        try {
            await writeAuditLog(req.user!.id, AuditLog.SETTING_UPDATED, 'setting', updated.id, { value: oldValue }, { value: updated.value });
        } catch (err) {
            logger.error('Audit log failed for setting %s: %o', name, err);
        }
        res.json({ code: CODES.SETTINGS_UPDATED, data: updated });
    } catch (err) { next(err); }
}
