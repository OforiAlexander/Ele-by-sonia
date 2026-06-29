import { Router } from 'express';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { listNotifications, unreadCount, markRead } from './notifications.controller';

const router = Router();

router.get('/',            isLoggedIn, listNotifications);
router.get('/unread-count', isLoggedIn, unreadCount);
router.post('/mark-read',  isLoggedIn, markRead);

export default router;
