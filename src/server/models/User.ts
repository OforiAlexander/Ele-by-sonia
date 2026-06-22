import { Model, QueryContext, RelationMappingsThunk } from 'objection';
import BaseModel from './_root';

export default class User extends BaseModel {
  static tableName = 'users';

  id!: string;
  email!: string;
  name!: string;
  phone!: string;
  password_hash!: string;
  role_id?: string;
  is_owner!: boolean;
  is_active!: boolean;
  must_change_password!: boolean;
  otp_code?: string;
  otp_expires_at?: string;
  otp_attempts!: number;
  reset_token?: string;
  reset_token_expires_at?: string;
  sessions_invalidated_at?: string;
  created_at!: string;
  updated_at?: string;

  role?: { id: string; name: string; permissions?: Array<{ name: string }> };

  // Computed permission flags — populated by $afterGet
  can_view_products?: boolean;
  can_create_products?: boolean;
  can_update_products?: boolean;
  can_delete_products?: boolean;
  can_set_price?: boolean;
  can_view_variants?: boolean;
  can_create_variants?: boolean;
  can_update_variants?: boolean;
  can_delete_variants?: boolean;
  can_view_stock?: boolean;
  can_add_stock?: boolean;
  can_adjust_stock?: boolean;
  can_set_threshold?: boolean;
  can_process_sales?: boolean;
  can_view_sales?: boolean;
  can_discount_sales?: boolean;
  can_void_sales?: boolean;
  can_return_sales?: boolean;
  can_view_staff?: boolean;
  can_create_staff?: boolean;
  can_update_staff?: boolean;
  can_deactivate_staff?: boolean;
  can_view_roles?: boolean;
  can_create_roles?: boolean;
  can_update_roles?: boolean;
  can_delete_roles?: boolean;
  can_view_reports?: boolean;
  can_export_reports?: boolean;
  can_view_settings?: boolean;
  can_update_settings?: boolean;

  public applyPermissionFlags(permNames: string[]): void {
    const has = (name: string) => this.is_owner || permNames.includes(name);
    this.can_view_products    = has('products.view');
    this.can_create_products  = has('products.create');
    this.can_update_products  = has('products.update');
    this.can_delete_products  = has('products.delete');
    this.can_set_price        = has('products.set_price');
    this.can_view_variants    = has('variants.view');
    this.can_create_variants  = has('variants.create');
    this.can_update_variants  = has('variants.update');
    this.can_delete_variants  = has('variants.delete');
    this.can_view_stock       = has('stock.view');
    this.can_add_stock        = has('stock.add');
    this.can_adjust_stock     = has('stock.adjust');
    this.can_set_threshold    = has('stock.set_threshold');
    this.can_process_sales    = has('sales.process');
    this.can_view_sales       = has('sales.view');
    this.can_discount_sales   = has('sales.discount');
    this.can_void_sales       = has('sales.void');
    this.can_return_sales     = has('sales.return');
    this.can_view_staff       = has('staff.view');
    this.can_create_staff     = has('staff.create');
    this.can_update_staff     = has('staff.update');
    this.can_deactivate_staff = has('staff.deactivate');
    this.can_view_roles       = has('roles.view');
    this.can_create_roles     = has('roles.create');
    this.can_update_roles     = has('roles.update');
    this.can_delete_roles     = has('roles.delete');
    this.can_view_reports     = has('reports.view');
    this.can_export_reports   = has('reports.export');
    this.can_view_settings    = has('settings.view');
    this.can_update_settings  = has('settings.update');
  }

  $afterFind(queryContext: QueryContext): void {
    super.$afterFind(queryContext);
    this.applyPermissionFlags(this.role?.permissions?.map((p) => p.name) ?? []);
  }

  static get relationMappings(): ReturnType<RelationMappingsThunk> {
    const Role = require('./Role').default;

    return {
      role: {
        relation: Model.BelongsToOneRelation,
        modelClass: Role,
        join: { from: 'users.role_id', to: 'roles.id' },
      },
    };
  }
}
