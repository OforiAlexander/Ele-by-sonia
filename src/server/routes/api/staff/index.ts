import { Router } from 'express';
import { body, query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    listStaffController,
    getStaffController,
    createStaffController,
    updateStaffController,
    toggleDeactivateController,
} from './staff.controller';

const router = Router();

const validateCreate = [
    body('name').notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phone').optional().isString(),
    body('role_id').optional({ nullable: true }).isUUID().withMessage('role_id must be a valid UUID.'),
    checkForValidationErrors,
];

const validateUpdate = [
    body('name').notEmpty().withMessage('Name is required.'),
    body('phone').optional().isString(),
    body('role_id').optional({ nullable: true }).isUUID().withMessage('role_id must be a valid UUID.'),
    checkForValidationErrors,
];

router.get('/',
    isLoggedIn,
    hasPermission('can_view_staff'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.').toInt(),
    checkForValidationErrors,
    listStaffController,
);
router.get('/:id', isLoggedIn, hasPermission('can_view_staff'), getStaffController);
router.post('/', isLoggedIn, hasPermission('can_create_staff'), validateCreate, createStaffController);
router.put('/:id', isLoggedIn, hasPermission('can_update_staff'), validateUpdate, updateStaffController);
router.patch('/:id/deactivate', isLoggedIn, hasPermission('can_deactivate_staff'), toggleDeactivateController);

export default router;
