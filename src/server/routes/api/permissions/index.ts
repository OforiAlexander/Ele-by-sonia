import { Router } from 'express';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { listPermissionsController } from './permissions.controller';

const router = Router();

router.get('/', isLoggedIn, listPermissionsController);

export default router;
