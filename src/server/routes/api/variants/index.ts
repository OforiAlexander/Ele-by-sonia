import { Router } from 'express';
import { body, query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    listOptionTypesController,
    createOptionTypeController,
    deleteOptionTypeController,
    addOptionValueController,
    deleteOptionValueController,
    listVariantsController,
    getVariantController,
    createVariantController,
    updateVariantController,
    deleteVariantController,
} from './variants.controller';

const router = Router();

const requireProductId = [
    query('productId').notEmpty().withMessage('productId query parameter is required.'),
    checkForValidationErrors,
];

const validateVariantBody = [
    body('cost_price').isFloat({ gt: 0 }).withMessage('cost_price must be a positive number.'),
    body('selling_price').isFloat({ gt: 0 }).withMessage('selling_price must be a positive number.'),
    body('optionValueIds').isArray().withMessage('optionValueIds must be an array.'),
    body('optionValueIds.*').isUUID().withMessage('Each optionValueId must be a valid UUID.'),
    body('low_stock_threshold').optional().isInt({ min: 0 }),
    body('sku').optional().isString().trim(),
    checkForValidationErrors,
];

router.get(
    '/option-types',
    isLoggedIn,
    hasPermission('can_view_variants'),
    requireProductId,
    listOptionTypesController,
);

router.post(
    '/option-types',
    isLoggedIn,
    hasPermission('can_create_variants'),
    body('product_id').notEmpty().withMessage('product_id is required.'),
    body('name').notEmpty().withMessage('name is required.'),
    checkForValidationErrors,
    createOptionTypeController,
);

router.delete(
    '/option-types/:id',
    isLoggedIn,
    hasPermission('can_delete_variants'),
    deleteOptionTypeController,
);

router.post(
    '/option-types/:id/values',
    isLoggedIn,
    hasPermission('can_create_variants'),
    body('value').notEmpty().withMessage('value is required.'),
    checkForValidationErrors,
    addOptionValueController,
);

router.delete(
    '/option-values/:id',
    isLoggedIn,
    hasPermission('can_delete_variants'),
    deleteOptionValueController,
);

router.get('/', isLoggedIn, hasPermission('can_view_variants'), requireProductId, listVariantsController);
router.get('/:id', isLoggedIn, hasPermission('can_view_variants'), getVariantController);

router.post(
    '/',
    isLoggedIn,
    hasPermission('can_create_variants'),
    body('product_id').notEmpty().withMessage('product_id is required.'),
    validateVariantBody,
    createVariantController,
);

router.put(
    '/:id',
    isLoggedIn,
    hasPermission('can_update_variants'),
    [
        ...validateVariantBody.slice(0, -1),
        body('is_active').optional().isBoolean(),
        checkForValidationErrors,
    ],
    updateVariantController,
);

router.delete('/:id', isLoggedIn, hasPermission('can_delete_variants'), deleteVariantController);

export default router;
