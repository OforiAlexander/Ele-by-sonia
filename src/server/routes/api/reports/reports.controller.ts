import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as ReportsService from './reports.service';

export async function summaryController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date } = req.query;
        const data = await ReportsService.getSummary(period as any, date as string | undefined);
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function profitController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date, groupBy } = req.query;
        const data = await ReportsService.getProfitBreakdown(
            period as any,
            date as string | undefined,
            (groupBy as string | undefined) ?? 'category',
        );
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function topProductsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date } = req.query;
        const limitN = Math.min(Number(req.query.limit ?? 10), 50);
        const data = await ReportsService.getTopProducts(period as any, date as string | undefined, limitN);
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function chartController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date, metric } = req.query;
        const data = await ReportsService.getChart(
            period as any,
            date as string | undefined,
            (metric as string | undefined) ?? 'revenue',
        );
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function stockHealthController(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ReportsService.getStockHealth();
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function taxController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date } = req.query;
        const data = await ReportsService.getTaxBreakdown(period as any, date as string | undefined);
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function stockMovementsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date } = req.query;
        const limitN = Math.min(Number(req.query.limit ?? 50), 200);
        const data = await ReportsService.getStockMovements(period as any, date as string | undefined, limitN);
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function returnsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date } = req.query;
        const data = await ReportsService.getReturnsReport(period as any, date as string | undefined);
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function activityController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const page  = Number(req.query.page ?? 1);
        const limit = Math.min(Number(req.query.limit ?? 25), 100);
        const data = await ReportsService.getActivityLog({
            page,
            limit,
            from:       req.query.from as string | undefined,
            to:         req.query.to as string | undefined,
            userId:     req.query.userId as string | undefined,
            action:     req.query.action as string | undefined,
            entityType: req.query.entityType as string | undefined,
        });
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}

export async function reconciliationController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { period, date } = req.query;
        const data = await ReportsService.getReconciliation(period as any, date as string | undefined);
        res.json({ code: CODES.OK, data });
    } catch (err) { next(err); }
}
