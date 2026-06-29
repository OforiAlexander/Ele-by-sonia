import { Request, Response, NextFunction } from 'express';
import { CODES } from '../../../codes';
import * as CategoriesService from './categories.service';
import AuditLog from '../../../models/AuditLog';
import { writeAuditLog } from '../../../services/audit/log';

export async function listCategoriesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await CategoriesService.listCategories();
    res.json({ data: categories });
  } catch (err) { next(err); }
}

export async function createCategoryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    const category = await CategoriesService.createCategory(name);
    await writeAuditLog(req.user!.id, AuditLog.CATEGORY_CREATED, 'category', category.id, undefined, { name });
    res.status(201).json({ code: CODES.CATEGORY_CREATED, data: category });
  } catch (err) { next(err); }
}

export async function updateCategoryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    const { category, before } = await CategoriesService.updateCategory(req.params.id, name);
    await writeAuditLog(req.user!.id, AuditLog.CATEGORY_UPDATED, 'category', category.id, { name: before }, { name });
    res.json({ code: CODES.CATEGORY_UPDATED, data: category });
  } catch (err) { next(err); }
}

export async function deleteCategoryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await CategoriesService.deleteCategory(req.params.id);
    await writeAuditLog(req.user!.id, AuditLog.CATEGORY_DELETED, 'category', category.id, { name: category.name });
    res.json({ code: CODES.CATEGORY_DELETED, data: category });
  } catch (err) { next(err); }
}
