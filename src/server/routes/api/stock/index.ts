import { Router } from 'express';
import { body, query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    listStockEntriesController,
    addStockController,
    adjustStockController,
    setThresholdController,
} from './stock.controller';

const router = Router();

const MAX_STOCK_QUANTITY = 10_000;
router.get(
    '/',
    isLoggedIn,
    hasPermission('can_view_stock'),
    query('variantId').notEmpty().isUUID().withMessage('variantId query parameter is required.'),
    checkForValidationErrors,
    listStockEntriesController,
);
router.post(
    '/add',
    isLoggedIn,
    hasPermission('can_add_stock'),
    body('variant_id').notEmpty().isUUID().withMessage('variant_id must be a valid UUID.'),
    body('quantity')
        .isInt({ min: 1, max: MAX_STOCK_QUANTITY })
        .withMessage(`quantity must be a positive integer up to ${MAX_STOCK_QUANTITY}.`),
    body('note').optional().isString().isLength({ max: 500 }).trim(),
    checkForValidationErrors,
    addStockController,
);
router.post(
    '/adjust',
    isLoggedIn,
    hasPermission('can_adjust_stock'),
    body('variant_id').notEmpty().isUUID().withMessage('variant_id must be a valid UUID.'),
    body('quantity')
        .isInt({ min: -MAX_STOCK_QUANTITY, max: MAX_STOCK_QUANTITY })
        .withMessage(`quantity must be a non-zero integer between -${MAX_STOCK_QUANTITY} and ${MAX_STOCK_QUANTITY}.`)
        .bail()
        .custom((v) => parseInt(v, 10) !== 0).withMessage('quantity cannot be zero.'),
    body('note')
        .notEmpty().withMessage('note is required for stock adjustments.')
        .isLength({ max: 500 }).withMessage('note must be 500 characters or fewer.'),
    checkForValidationErrors,
    adjustStockController,
);
router.patch(
    '/threshold/:variantId',
    isLoggedIn,
    hasPermission('can_set_threshold'),
    body('low_stock_threshold')
        .isInt({ min: 0 })
        .withMessage('low_stock_threshold must be a non-negative integer.'),
    checkForValidationErrors,
    setThresholdController,
);

export default router;
