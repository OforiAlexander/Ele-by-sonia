import { Router } from 'express';
import { body, param } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
  listCategoriesController,
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
} from './categories.controller';

const router = Router();

const validateName = [
  body('name').trim().notEmpty().withMessage('name is required.').isLength({ max: 100 }).withMessage('name must be 100 characters or fewer.'),
  checkForValidationErrors,
];

const requireId = [
  param('id').isUUID().withMessage('id must be a valid UUID.'),
  checkForValidationErrors,
];

router.get('/', isLoggedIn, listCategoriesController);

router.post('/', isLoggedIn, hasPermission('can_manage_categories'), validateName, createCategoryController);

router.put('/:id', isLoggedIn, hasPermission('can_manage_categories'), requireId, validateName, updateCategoryController);

router.delete('/:id', isLoggedIn, hasPermission('can_manage_categories'), requireId, deleteCategoryController);

export default router;
