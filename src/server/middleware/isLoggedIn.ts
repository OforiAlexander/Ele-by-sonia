import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { CODES } from '../codes';
import { ensureLoaded, getPermissionNames } from '../startup/permissionCache';

declare module 'express-session' {
    interface SessionData {
        userId: string;
        loggedInAt: string;
    }
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: User;
    }
}

export async function isLoggedIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { userId, loggedInAt } = req.session ?? {};

    if (!userId) {
        res.status(401).json({ code: CODES.NOT_LOGGED_IN, message: 'You must be logged in.' });
        return;
    }

    await ensureLoaded();
    const user = await User.query().findById(userId);

    if (!user) {
        req.session.destroy(() => undefined);
        res.status(401).json({ code: CODES.NOT_LOGGED_IN, message: 'Session is invalid.' });
        return;
    }

    if (!user.is_active) {
        req.session.destroy(() => undefined);
        res.status(403).json({ code: CODES.ACCOUNT_INACTIVE, message: 'This account has been deactivated.' });
        return;
    }

    if (user.sessions_invalidated_at && loggedInAt && loggedInAt < user.sessions_invalidated_at) {
        req.session.destroy(() => undefined);
        res.status(401).json({ code: CODES.NOT_LOGGED_IN, message: 'Session has been invalidated.' });
        return;
    }

    user.applyPermissionFlags(getPermissionNames(user.role_id));
    req.user = user;
    next();
}
