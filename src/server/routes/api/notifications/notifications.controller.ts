import { Request, Response } from 'express';
import { getNotificationsForUser, getUnreadCount, markAllRead } from './notifications.service';

export async function listNotifications(req: Request, res: Response): Promise<void> {
    const notifications = await getNotificationsForUser(req.user!.id);
    res.json({ code: 'OK', data: { notifications } });
}

export async function unreadCount(req: Request, res: Response): Promise<void> {
    const count = await getUnreadCount(req.user!.id);
    res.json({ code: 'OK', data: { count } });
}

export async function markRead(req: Request, res: Response): Promise<void> {
    await markAllRead(req.user!.id);
    res.json({ code: 'OK', data: null });
}
