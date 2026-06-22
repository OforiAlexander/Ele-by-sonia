import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as VariantsService from './variants.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listOptionTypesController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await VariantsService.listOptionTypes(req.query.productId as string) });
    } catch (err) { next(err); }
}

export async function createOptionTypeController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { product_id, name } = req.body;
        const type = await VariantsService.createOptionType(product_id, name);
        await writeAuditLog(req.user!.id, AuditLog.OPTION_TYPE_CREATED, 'option_type', (type as any).id,
            undefined, { product_id, name });
        res.status(201).json({ code: CODES.OPTION_TYPE_CREATED, data: type });
    } catch (err) { next(err); }
}

export async function deleteOptionTypeController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await VariantsService.deleteOptionType(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.OPTION_TYPE_DELETED, 'option_type', req.params.id);
        res.json({ code: CODES.OPTION_TYPE_DELETED });
    } catch (err) { next(err); }
}

export async function addOptionValueController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const value = await VariantsService.addOptionValue(req.params.id, req.body.value);
        await writeAuditLog(req.user!.id, AuditLog.OPTION_VALUE_ADDED, 'option_value', (value as any).id,
            undefined, { option_type_id: req.params.id, value: req.body.value });
        res.status(201).json({ code: CODES.OPTION_VALUE_ADDED, data: value });
    } catch (err) { next(err); }
}

export async function deleteOptionValueController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await VariantsService.deleteOptionValue(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.OPTION_VALUE_DELETED, 'option_value', req.params.id);
        res.json({ code: CODES.OPTION_VALUE_DELETED });
    } catch (err) { next(err); }
}

export async function listVariantsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await VariantsService.listVariants(req.query.productId as string) });
    } catch (err) { next(err); }
}

export async function getVariantController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await VariantsService.getVariant(req.params.id) });
    } catch (err) { next(err); }
}

export async function createVariantController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { product_id, cost_price, selling_price, optionValueIds, low_stock_threshold, sku } = req.body;
        const variant = await VariantsService.createVariant(product_id, cost_price, selling_price, optionValueIds ?? [], low_stock_threshold, sku);
        await writeAuditLog(req.user!.id, AuditLog.VARIANT_CREATED, 'variant', variant.id,
            undefined, { product_id, cost_price, selling_price, sku, optionValueIds: optionValueIds ?? [] });
        res.status(201).json({ code: CODES.VARIANT_CREATED, data: variant });
    } catch (err) { next(err); }
}

export async function updateVariantController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { cost_price, selling_price, optionValueIds, low_stock_threshold, sku, is_active } = req.body;
        const { variant, before } = await VariantsService.updateVariant(req.params.id, cost_price, selling_price, optionValueIds ?? [], low_stock_threshold, sku, is_active);
        await writeAuditLog(req.user!.id, AuditLog.VARIANT_UPDATED, 'variant', variant.id,
            before,
            { cost_price, selling_price, sku, is_active });
        res.json({ code: CODES.VARIANT_UPDATED, data: variant });
    } catch (err) { next(err); }
}

export async function deleteVariantController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const deleted = await VariantsService.deleteVariant(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.VARIANT_DELETED, 'variant', deleted.id,
            { product_id: deleted.product_id, sku: deleted.sku });
        res.json({ code: CODES.VARIANT_DELETED });
    } catch (err) { next(err); }
}
