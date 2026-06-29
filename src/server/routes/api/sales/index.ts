import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    processSaleController,
    listSalesController,
    getSaleController,
    voidSaleController,
    processSaleReturnController,
    verifyPaymentController,
} from './sales.controller';

const router = Router();

router.post(
    '/',
    isLoggedIn,
    hasPermission('can_process_sales'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
    body('items.*.variant_id').isUUID().withMessage('Each item must have a valid variant_id UUID.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be a positive integer.').toInt(),
    body('items.*.unit_price_override').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('unit_price_override must be a non-negative number.').toFloat(),
    body('payment_method').isIn(['cash', 'momo']).withMessage('payment_method must be cash or momo.'),
    body('amount_tendered').custom((val, { req }) => {
        if (req.body.payment_method === 'cash') {
            if (val === undefined || val === null || val === '') {
                throw new Error('amount_tendered is required for cash payments.');
            }
            if (isNaN(Number(val)) || Number(val) < 0) {
                throw new Error('amount_tendered must be a non-negative number.');
            }
        }
        return true;
    }),
    body('customer_phone').custom((val, { req }) => {
        if (req.body.payment_method === 'momo') {
            if (!val || typeof val !== 'string' || val.trim().length < 10) {
                throw new Error('customer_phone is required for Momo payments.');
            }
        }
        return true;
    }),
    body('momo_provider').custom((val, { req }) => {
        if (req.body.payment_method === 'momo') {
            if (!['mtn', 'vod', 'atl'].includes(val)) {
                throw new Error('momo_provider must be mtn, vod, or atl.');
            }
        }
        return true;
    }),
    body('discount').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('discount must be a non-negative number.').toFloat(),
    body('note').optional().isString().isLength({ max: 500 }).trim(),
    body('items').custom((items: Array<{ variant_id: string }>) => {
        const ids = items.map((i) => i.variant_id);
        if (new Set(ids).size !== ids.length) {
            throw new Error('Duplicate variant IDs are not allowed in a single sale.');
        }
        return true;
    }),
    checkForValidationErrors,
    processSaleController,
);

router.get(
    '/',
    isLoggedIn,
    hasPermission('can_view_sales'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('payment_method').optional().isIn(['cash', 'momo']),
    query('payment_status').optional().isIn(['pending', 'paid', 'failed']),
    query('include_voided').optional().isBoolean(),
    query('include_stats').optional().isBoolean(),
    checkForValidationErrors,
    listSalesController,
);

router.get(
    '/:id',
    isLoggedIn,
    hasPermission('can_view_sales'),
    param('id').isUUID(),
    checkForValidationErrors,
    getSaleController,
);

router.post(
    '/:id/void',
    isLoggedIn,
    hasPermission('can_void_sales'),
    param('id').isUUID(),
    checkForValidationErrors,
    voidSaleController,
);

router.post(
    '/:id/verify-payment',
    isLoggedIn,
    hasPermission('can_verify_payment'),
    param('id').isUUID(),
    checkForValidationErrors,
    verifyPaymentController,
);

router.post(
    '/:id/return',
    isLoggedIn,
    hasPermission('can_return_sales'),
    param('id').isUUID().withMessage('Invalid sale id.'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
    body('items.*.sale_item_id').isUUID().withMessage('Each item must have a valid sale_item_id UUID.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be a positive integer.').toInt(),
    body('note').optional().isString().isLength({ max: 500 }).trim(),
    checkForValidationErrors,
    processSaleReturnController,
);

export default router;
