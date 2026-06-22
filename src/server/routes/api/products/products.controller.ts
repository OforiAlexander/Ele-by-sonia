import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as ProductsService from './products.service';
import { importFromCsv } from './csv-import.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listProductsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const page = Math.max(Number(req.query.page ?? 1), 1);
        const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
        res.json({ data: await ProductsService.listProducts(page, limit) });
    } catch (err) { next(err); }
}

export async function getProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await ProductsService.getProduct(req.params.id) });
    } catch (err) { next(err); }
}

export async function createProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, category, description, brand } = req.body;
        const product = await ProductsService.createProduct(name, category, description, brand, req.user!.id);
        await writeAuditLog(req.user!.id, AuditLog.PRODUCT_CREATED, 'product', product.id,
            undefined, { name, category, description, brand });
        res.status(201).json({ code: CODES.PRODUCT_CREATED, data: product });
    } catch (err) { next(err); }
}

export async function updateProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { name, category, description, brand } = req.body;
        const { product, before } = await ProductsService.updateProduct(req.params.id, name, category, description, brand);
        await writeAuditLog(req.user!.id, AuditLog.PRODUCT_UPDATED, 'product', product.id, before, { name, category, description, brand });
        res.json({ code: CODES.PRODUCT_UPDATED, data: product });
    } catch (err) { next(err); }
}

export async function importProductsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.file) {
            res.status(422).json({ code: CODES.VALIDATION_ERROR, errors: [{ msg: 'file is required.' }] });
            return;
        }
        const result = await importFromCsv(req.file.buffer, req.user!.id);
        res.json({ code: CODES.IMPORT_COMPLETE, data: result });
    } catch (err) { next(err); }
}

export async function deleteProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const product = await ProductsService.deactivateProduct(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.PRODUCT_DEACTIVATED, 'product', product.id,
            { name: product.name, is_active: true });
        res.json({ code: CODES.PRODUCT_DELETED, data: product });
    } catch (err) { next(err); }
}
