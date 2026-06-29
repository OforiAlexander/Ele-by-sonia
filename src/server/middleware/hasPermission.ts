import { Request, Response, NextFunction } from 'express';
import { CODES } from '../codes';
import User from '../models/User';

type PermissionFlag = keyof Pick<
  User,
  | 'can_view_products' | 'can_create_products' | 'can_update_products' | 'can_delete_products' | 'can_set_price'
  | 'can_view_variants' | 'can_create_variants' | 'can_update_variants' | 'can_delete_variants'
  | 'can_view_stock' | 'can_add_stock' | 'can_adjust_stock' | 'can_set_threshold'
  | 'can_process_sales' | 'can_view_sales' | 'can_discount_sales' | 'can_void_sales' | 'can_return_sales' | 'can_verify_payment'
  | 'can_view_staff' | 'can_create_staff' | 'can_update_staff' | 'can_deactivate_staff'
  | 'can_view_roles' | 'can_create_roles' | 'can_update_roles' | 'can_delete_roles'
  | 'can_view_reports' | 'can_export_reports'
  | 'can_view_settings' | 'can_update_settings'
  | 'can_view_categories' | 'can_manage_categories'
>;

export function hasPermission(flag: PermissionFlag) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: CODES.NOT_LOGGED_IN, message: 'You must be logged in.' });
      return;
    }

    if (req.user[flag]) {
      next();
    } else {
      res.status(403).json({ code: CODES.FORBIDDEN, message: 'You do not have permission to do this.' });
    }
  };
}
