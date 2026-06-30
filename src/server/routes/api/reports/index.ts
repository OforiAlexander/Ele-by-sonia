import { Router } from 'express';
import { query } from 'express-validator';
import { isLoggedIn } from '../../../middleware/isLoggedIn';
import { hasPermission } from '../../../middleware/hasPermission';
import { checkForValidationErrors } from '../../../middleware/validate';
import {
    summaryController,
    profitController,
    topProductsController,
    chartController,
    stockHealthController,
    taxController,
    stockMovementsController,
    returnsController,
    activityController,
    reconciliationController,
} from './reports.controller';

const router = Router();

const PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'] as const;

const periodParam = query('period')
    .notEmpty().withMessage('period is required.')
    .isIn(PERIODS).withMessage('period must be daily, weekly, monthly, quarterly, or annual.');

const dateParam = query('date')
    .optional()
    .isDate().withMessage('date must be YYYY-MM-DD.');

router.get('/summary',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    checkForValidationErrors,
    summaryController,
);

router.get('/profit',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    query('groupBy').optional().isIn(['category', 'product', 'payment_method', 'staff']).withMessage('groupBy must be category, product, payment_method, or staff.'),
    checkForValidationErrors,
    profitController,
);

router.get('/top-products',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    checkForValidationErrors,
    topProductsController,
);

router.get('/chart',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    query('metric').optional().isIn(['revenue', 'profit', 'units']).withMessage('metric must be revenue, profit, or units.'),
    checkForValidationErrors,
    chartController,
);

router.get('/stock-health',
    isLoggedIn,
    hasPermission('can_view_reports'),
    stockHealthController,
);

router.get('/tax',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    checkForValidationErrors,
    taxController,
);

router.get('/stock-movements',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
    checkForValidationErrors,
    stockMovementsController,
);

router.get('/returns',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    checkForValidationErrors,
    returnsController,
);

router.get('/activity',
    isLoggedIn,
    hasPermission('can_view_reports'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('from').optional().isDate().withMessage('from must be YYYY-MM-DD.'),
    query('to').optional().isDate().withMessage('to must be YYYY-MM-DD.'),
    query('userId').optional().isUUID().withMessage('userId must be a valid UUID.'),
    query('action').optional().isString(),
    query('entityType').optional().isString(),
    checkForValidationErrors,
    activityController,
);

router.get('/reconciliation',
    isLoggedIn,
    hasPermission('can_view_reports'),
    periodParam,
    dateParam,
    checkForValidationErrors,
    reconciliationController,
);

export default router;
