import { Router } from 'express';
import { body, query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    processSaleController,
    listSalesController,
    getSaleController,
    voidSaleController,
} from './sales.controller';

const router = Router();

router.post(
    '/',
    isLoggedIn,
    hasPermission('can_process_sales'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
    body('items.*.variant_id').isUUID().withMessage('Each item must have a valid variant_id UUID.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item quantity must be a positive integer.').toInt(),
    body('payment_method').isIn(['cash', 'momo']).withMessage('payment_method must be cash or momo.'),
    body('amount_tendered').custom((val, { req }) => {
        if (req.body.payment_method === 'cash') {
            if (val === undefined || val === null || val === '') throw new Error('amount_tendered is required for cash payments.');
            if (isNaN(Number(val)) || Number(val) < 0) throw new Error('amount_tendered must be a non-negative number.');
        }
        return true;
    }),
    body('discount').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('discount must be a non-negative number.').toFloat(),
    body('note').optional().isString().isLength({ max: 500 }).trim(),
    body('items').custom((items: Array<{ variant_id: string }>) => {
        const ids = items.map((i) => i.variant_id);
        if (new Set(ids).size !== ids.length) throw new Error('Duplicate variant IDs are not allowed in a single sale.');
        return true;
    }),
    checkForValidationErrors,
    processSaleController,
);

router.get(
    '/',
    isLoggedIn,
    hasPermission('can_view_sales'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.').toInt(),
    query('from').optional().isISO8601().withMessage('from must be a valid ISO date.'),
    query('to').optional().isISO8601().withMessage('to must be a valid ISO date.'),
    query('payment_method').optional().isIn(['cash', 'momo']).withMessage('payment_method must be cash or momo.'),
    checkForValidationErrors,
    listSalesController,
);

router.get(
    '/:id',
    isLoggedIn,
    hasPermission('can_view_sales'),
    getSaleController,
);

router.post(
    '/:id/void',
    isLoggedIn,
    hasPermission('can_void_sales'),
    voidSaleController,
);

export default router;
