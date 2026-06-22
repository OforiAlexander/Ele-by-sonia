import { Request, Response, NextFunction } from 'express';
import { getPermissionsGrouped } from './permissions.service';

export async function listPermissionsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await getPermissionsGrouped();
        res.json({ data });
    } catch (err) {
        next(err);
    }
}
