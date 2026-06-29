import { Router } from 'express';
import { body } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    listPublicSettingsController,
    listSettingsController,
    updateSettingController,
} from './settings.controller';

const router = Router();

router.get('/public',
    isLoggedIn,
    listPublicSettingsController,
);

router.get('/',
    isLoggedIn,
    hasPermission('can_view_settings'),
    listSettingsController,
);

router.put('/:name',
    isLoggedIn,
    hasPermission('can_update_settings'),
    body('value').notEmpty().withMessage('value is required.'),
    checkForValidationErrors,
    updateSettingController,
);

export default router;
