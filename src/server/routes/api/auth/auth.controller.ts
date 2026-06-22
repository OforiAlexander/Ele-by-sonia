import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as AuthService from './auth.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password, recaptchaToken } = req.body;
        const user = await AuthService.login(email, password, recaptchaToken);

        req.session.userId = (user as any).id;
        req.session.loggedInAt = new Date().toISOString();

        await writeAuditLog((user as any).id, AuditLog.LOGIN, 'user', (user as any).id);
        res.json({ code: CODES.LOGGED_IN, data: user });
    } catch (err) {
        next(err);
    }
}

export async function logoutController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.session.userId!;
        await new Promise<void>((resolve, reject) => {
            req.session.destroy((err) => (err ? reject(err) : resolve()));
        });
        await writeAuditLog(userId, AuditLog.LOGOUT, 'user', userId);
        res.json({ code: CODES.LOGGED_OUT });
    } catch (err) {
        next(err);
    }
}

export async function meController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await AuthService.getMe(req.session.userId!);
        res.json({ code: CODES.LOGGED_IN, data: user });
    } catch (err) {
        next(err);
    }
}

export async function changePasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.userId!;
        await AuthService.changePassword(userId, currentPassword, newPassword);
        await writeAuditLog(userId, AuditLog.PASSWORD_CHANGED, 'user', userId);
        res.json({ code: CODES.PASSWORD_CHANGED });
    } catch (err) {
        next(err);
    }
}

export async function forgotPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await AuthService.forgotPassword(req.body.identifier);
        res.json({ code: CODES.RESET_CODE_SENT });
    } catch (err) {
        next(err);
    }
}

export async function verifyCodeController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { identifier, code } = req.body;
        const resetToken = await AuthService.verifyCode(identifier, code);
        res.json({ code: CODES.CODE_VERIFIED, data: { resetToken } });
    } catch (err) {
        next(err);
    }
}

export async function resetPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { token, newPassword } = req.body;
        const userId = await AuthService.resetPassword(token, newPassword);
        await writeAuditLog(userId, AuditLog.PASSWORD_RESET, 'user', userId);
        res.json({ code: CODES.PASSWORD_UPDATED });
    } catch (err) {
        next(err);
    }
}
