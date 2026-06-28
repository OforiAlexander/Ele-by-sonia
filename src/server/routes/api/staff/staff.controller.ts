import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as StaffService from './staff.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listStaffController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const page = Math.max(Number(req.query.page ?? 1), 1);
        const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
        res.json({ data: await StaffService.listStaff(page, limit) });
    } catch (err) { next(err); }
}

export async function getStaffController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await StaffService.getStaffMember(req.params.id) });
    } catch (err) { next(err); }
}

export async function createStaffController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, email, phone, role_id } = req.body;
        const staff = await StaffService.createStaff(name, email, phone, role_id);
        await writeAuditLog(req.user!.id, AuditLog.STAFF_CREATED, 'user', (staff as any).id,
            undefined, { name, email, phone, role_id });
        res.status(201).json({ code: CODES.STAFF_CREATED, data: staff });
    } catch (err) { next(err); }
}

export async function updateStaffController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, phone, role_id } = req.body;
        const existing = await StaffService.getStaffMember(req.params.id);
        const staff = await StaffService.updateStaff(req.params.id, name, phone, role_id);
        await writeAuditLog(req.user!.id, AuditLog.STAFF_UPDATED, 'user', (staff as any).id,
            { name: (existing as any).name, phone: (existing as any).phone, role_id: (existing as any).role_id },
            { name, phone, role_id });
        res.json({ code: CODES.STAFF_UPDATED, data: staff });
    } catch (err) { next(err); }
}

export async function toggleDeactivateController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const staff = await StaffService.toggleDeactivate(req.params.id);
        const action = (staff as any).is_active ? AuditLog.STAFF_REACTIVATED : AuditLog.STAFF_DEACTIVATED;
        await writeAuditLog(req.user!.id, action, 'user', (staff as any).id);
        res.json({ data: staff });
    } catch (err) { next(err); }
}

export async function resendInvitationController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const staff = await StaffService.resendInvitation(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.INVITATION_RESENT, 'user', (staff as any).id);
        res.json({ code: CODES.INVITATION_RESENT, data: staff });
    } catch (err) { next(err); }
}

export async function cancelInvitationController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await StaffService.cancelInvitation(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.INVITATION_CANCELLED, 'user', req.params.id);
        res.json({ code: CODES.INVITATION_CANCELLED });
    } catch (err) { next(err); }
}
