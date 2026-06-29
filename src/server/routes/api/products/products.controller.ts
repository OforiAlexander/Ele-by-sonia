import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as ProductsService from './products.service';
import * as ImagesService from './images.service';
import { importFromCsv, buildCsvTemplate } from './csv-import.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listProductsController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const page     = Math.max(Number(req.query.page ?? 1), 1);
        const limit    = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 100);
        const search   = String(req.query.search   ?? '').trim();
        const category = String(req.query.category ?? '').trim();
        res.json({ data: await ProductsService.listProducts(page, limit, search, category) });
    } catch (err) { next(err); }
}

export async function getProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await ProductsService.getProduct(req.params.id) });
    } catch (err) { next(err); }
}

export async function createProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
            res.status(422).json({ code: CODES.VALIDATION_ERROR, errors: [{ msg: 'At least one product image is required.' }] });
            return;
        }
        const { name, category, description, brand } = req.body;
        const product = await ProductsService.createProduct(name, category, description, brand, req.user!.id);
        // Product creation is independent of S3 — failures here are logged but never fail the request
        await ImagesService.addImages(product.id, files).catch((err) => {
            console.error('[S3] Image upload failed for new product', product.id, err);
        });
        const productWithImages = await ProductsService.getProduct(product.id);
        await writeAuditLog(req.user!.id, AuditLog.PRODUCT_CREATED, 'product', product.id,
            undefined, { name, category, description, brand });
        res.status(201).json({ code: CODES.PRODUCT_CREATED, data: productWithImages });
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

export async function activateProductController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const product = await ProductsService.activateProduct(req.params.id);
        await writeAuditLog(req.user!.id, AuditLog.PRODUCT_UPDATED, 'product', product.id,
            { is_active: false }, { is_active: true });
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

export async function downloadTemplateController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="import_template.csv"');
        res.send(buildCsvTemplate());
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
