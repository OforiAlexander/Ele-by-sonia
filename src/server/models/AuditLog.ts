import { Model } from 'objection';

export default class AuditLog extends Model {
  static tableName = 'audit_logs';

  // Auth
  static readonly LOGIN = 'LOGIN';
  static readonly LOGOUT = 'LOGOUT';
  static readonly PASSWORD_CHANGED = 'PASSWORD_CHANGED';
  static readonly PASSWORD_RESET = 'PASSWORD_RESET';

  // Roles
  static readonly ROLE_CREATED = 'ROLE_CREATED';
  static readonly ROLE_UPDATED = 'ROLE_UPDATED';
  static readonly ROLE_DELETED = 'ROLE_DELETED';
  static readonly ROLE_PERMISSIONS_CHANGED = 'ROLE_PERMISSIONS_CHANGED';

  // Staff
  static readonly STAFF_CREATED = 'STAFF_CREATED';
  static readonly STAFF_UPDATED = 'STAFF_UPDATED';
  static readonly STAFF_DEACTIVATED = 'STAFF_DEACTIVATED';
  static readonly STAFF_REACTIVATED = 'STAFF_REACTIVATED';

  // Products
  static readonly PRODUCT_CREATED = 'PRODUCT_CREATED';
  static readonly PRODUCT_UPDATED = 'PRODUCT_UPDATED';
  static readonly PRODUCT_DELETED = 'PRODUCT_DELETED';
  static readonly PRODUCT_DEACTIVATED = 'PRODUCT_DEACTIVATED';

  // Variants & Options
  static readonly VARIANT_CREATED = 'VARIANT_CREATED';
  static readonly VARIANT_UPDATED = 'VARIANT_UPDATED';
  static readonly VARIANT_DELETED = 'VARIANT_DELETED';
  static readonly OPTION_TYPE_CREATED = 'OPTION_TYPE_CREATED';
  static readonly OPTION_TYPE_DELETED = 'OPTION_TYPE_DELETED';
  static readonly OPTION_VALUE_ADDED = 'OPTION_VALUE_ADDED';
  static readonly OPTION_VALUE_DELETED = 'OPTION_VALUE_DELETED';

  // Stock & Sales
  static readonly STOCK_ADDED = 'STOCK_ADDED';
  static readonly STOCK_ADJUSTED = 'STOCK_ADJUSTED';
  static readonly LOW_STOCK_THRESHOLD_SET = 'LOW_STOCK_THRESHOLD_SET';
  static readonly PRICE_CHANGED = 'PRICE_CHANGED';
  static readonly SALE_COMPLETED = 'SALE_COMPLETED';
  static readonly SALE_VOIDED = 'SALE_VOIDED';
  static readonly DISCOUNT_APPLIED = 'DISCOUNT_APPLIED';

  // Settings
  static readonly SETTING_UPDATED = 'SETTING_UPDATED';

  id!: string;
  user_id!: string;
  action!: string;
  entity_type!: string;
  entity_id!: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  created_at!: string;
}
