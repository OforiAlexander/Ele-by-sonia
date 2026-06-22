import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as RolesService from './roles.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listRolesController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await RolesService.listRoles() });
    } catch (err) { next(err); }
}

export async function getRoleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await RolesService.getRole(req.params.id) });
    } catch (err) { next(err); }
}

export async function createRoleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, description, permissionIds } = req.body;
        const role = await RolesService.createRole(name, description, permissionIds, req.user!.id);
        await writeAuditLog(req.user!.id, AuditLog.ROLE_CREATED, 'role', role.id,
            undefined, { name, description, permissionIds });
        res.status(201).json({ code: CODES.ROLE_CREATED, data: role });
    } catch (err) { next(err); }
}

export async function updateRoleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, description, permissionIds } = req.body;
        const { role, before } = await RolesService.updateRole(req.params.id, name, description, permissionIds);
        await writeAuditLog(req.user!.id, AuditLog.ROLE_UPDATED, 'role', role.id,
            before,
            { name, description, permissionIds });
        res.json({ code: CODES.ROLE_UPDATED, data: role });
    } catch (err) { next(err); }
}

export async function deleteRoleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const deleted = await RolesService.deleteRole(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.ROLE_DELETED, 'role', deleted.id,
            { name: deleted.name });
        res.json({ code: CODES.ROLE_DELETED });
    } catch (err) { next(err); }
}
