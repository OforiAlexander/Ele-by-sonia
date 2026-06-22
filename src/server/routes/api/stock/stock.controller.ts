import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as StockService from './stock.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listStockEntriesController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await StockService.listStockEntries(req.query.variantId as string) });
    } catch (err) { next(err); }
}

export async function addStockController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { variant_id, quantity, note } = req.body;
        const { variant, stockBefore } = await StockService.addStock(variant_id, quantity, note, req.user!.id);
        await writeAuditLog(req.user!.id, AuditLog.STOCK_ADDED, 'variant', variant_id,
            { stock: stockBefore },
            { stock: variant.stock, quantity_added: quantity, note });
        res.status(201).json({ code: CODES.STOCK_ADDED, data: variant });
    } catch (err) { next(err); }
}

export async function adjustStockController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { variant_id, quantity, note } = req.body;
        const { variant, stockBefore } = await StockService.adjustStock(variant_id, quantity, note, req.user!.id);
        await writeAuditLog(req.user!.id, AuditLog.STOCK_ADJUSTED, 'variant', variant_id,
            { stock: stockBefore },
            { stock: variant.stock, quantity_delta: quantity, note });
        res.status(201).json({ code: CODES.STOCK_ADJUSTED, data: variant });
    } catch (err) { next(err); }
}

export async function setThresholdController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { low_stock_threshold } = req.body;
        const { variant, thresholdBefore } = await StockService.setThreshold(req.params.variantId, low_stock_threshold);
        await writeAuditLog(req.user!.id, AuditLog.LOW_STOCK_THRESHOLD_SET, 'variant', req.params.variantId,
            { low_stock_threshold: thresholdBefore },
            { low_stock_threshold: variant.low_stock_threshold });
        res.json({ code: CODES.THRESHOLD_UPDATED, data: variant });
    } catch (err) { next(err); }
}
