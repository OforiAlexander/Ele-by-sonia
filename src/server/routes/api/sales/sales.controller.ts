import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as SalesService from './sales.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';
import logger from '../../../services/logger';

export async function processSaleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { items, payment_method, amount_tendered, discount, note, customer_phone, momo_provider } = req.body;

        if (discount && Number(discount) > 0 && !req.user!.can_discount_sales && !req.user!.is_owner) {
            res.status(403).json({ code: CODES.FORBIDDEN, error: 'You do not have permission to apply discounts.' });
            return;
        }

        const canOverridePrice = !!(req.user!.can_override_price || req.user!.is_owner);

        const sale = await SalesService.processSale(
            req.user!.id,
            items,
            payment_method,
            amount_tendered !== undefined ? Number(amount_tendered) : undefined,
            Number(discount ?? 0),
            note,
            customer_phone,
            momo_provider,
            canOverridePrice,
        );

        try {
            await writeAuditLog(
                req.user!.id, AuditLog.SALE_COMPLETED, 'sale', sale.id,
                undefined,
                { sale_number: sale.sale_number, amount_due: sale.amount_due, payment_method: sale.payment_method },
            );
        } catch (err) {
            logger.error('Audit log failed for sale %s: %o', sale.id, err);
        }

        res.status(201).json({ code: CODES.SALE_COMPLETED, data: sale });
    } catch (err) { next(err); }
}

export async function listSalesController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const page  = Number(req.query.page  ?? 1);
        const limit = Math.min(Number(req.query.limit ?? 20), 100);
        const result = await SalesService.listSales({
            page,
            limit,
            from:          req.query.from           as string | undefined,
            to:            req.query.to             as string | undefined,
            paymentMethod: req.query.payment_method as string | undefined,
            includeVoided: req.query.include_voided === 'true',
        });
        res.json({ data: result });
    } catch (err) { next(err); }
}

export async function getSaleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await SalesService.getSale(req.params.id) });
    } catch (err) { next(err); }
}

export async function voidSaleController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const sale = await SalesService.voidSale(req.params.id, req.user!.id);

        try {
            await writeAuditLog(
                req.user!.id, AuditLog.SALE_VOIDED, 'sale', sale.id,
                { sale_number: sale.sale_number, amount_due: sale.amount_due },
            );
        } catch (err) {
            logger.error('Audit log failed for void of sale %s: %o', sale.id, err);
        }

        res.json({ code: CODES.SALE_VOIDED, data: sale });
    } catch (err) { next(err); }
}

export async function processSaleReturnController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { items, note } = req.body;
        const result = await SalesService.processSaleReturn(
            req.params.id,
            req.user!.id,
            items,
            note,
        );

        try {
            await writeAuditLog(
                req.user!.id, AuditLog.SALE_VOIDED, 'sale_return', result.id,
                undefined,
                { sale_id: req.params.id, item_count: items.length },
            );
        } catch (err) {
            logger.error('Audit log failed for return on sale %s: %o', req.params.id, err);
        }

        res.status(201).json({ code: CODES.SALE_RETURN_PROCESSED, data: result });
    } catch (err) { next(err); }
}
