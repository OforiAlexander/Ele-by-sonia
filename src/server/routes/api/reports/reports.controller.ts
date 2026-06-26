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
