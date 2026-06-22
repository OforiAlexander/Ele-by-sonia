import { Router } from 'express';
import { body } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    listRolesController,
    getRoleController,
    createRoleController,
    updateRoleController,
    deleteRoleController,
} from './roles.controller';

const router = Router();

const validateRole = [
    body('name').notEmpty().withMessage('Role name is required.'),
    body('permissionIds').isArray().withMessage('permissionIds must be an array.'),
    checkForValidationErrors,
];

router.get('/', isLoggedIn, hasPermission('can_view_roles'), listRolesController);
router.post('/', isLoggedIn, hasPermission('can_create_roles'), validateRole, createRoleController);
router.get('/:id', isLoggedIn, hasPermission('can_view_roles'), getRoleController);
router.put('/:id', isLoggedIn, hasPermission('can_update_roles'), validateRole, updateRoleController);
router.delete('/:id', isLoggedIn, hasPermission('can_delete_roles'), deleteRoleController);

export default router;
