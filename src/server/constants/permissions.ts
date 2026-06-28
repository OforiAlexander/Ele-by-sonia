export const PERMISSIONS = {
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_SET_PRICE: 'products.set_price',
  VARIANTS_VIEW: 'variants.view',
  VARIANTS_CREATE: 'variants.create',
  VARIANTS_UPDATE: 'variants.update',
  VARIANTS_DELETE: 'variants.delete',
  STOCK_VIEW: 'stock.view',
  STOCK_ADD: 'stock.add',
  STOCK_ADJUST: 'stock.adjust',
  STOCK_SET_THRESHOLD: 'stock.set_threshold',
  SALES_PROCESS: 'sales.process',
  SALES_VIEW: 'sales.view',
  SALES_DISCOUNT: 'sales.discount',
  SALES_VOID: 'sales.void',
  SALES_RETURN: 'sales.return',
  SALES_OVERRIDE_PRICE: 'sales.override_price',
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_DEACTIVATE: 'staff.deactivate',
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_MANAGE: 'categories.manage',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  name: PermissionName;
  label: string;
  resource: string;
  is_sensitive: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { name: PERMISSIONS.PRODUCTS_VIEW,       label: 'View products and catalogue',            resource: 'products', is_sensitive: false },
  { name: PERMISSIONS.PRODUCTS_CREATE,     label: 'Add new products',                       resource: 'products', is_sensitive: false },
  { name: PERMISSIONS.PRODUCTS_UPDATE,     label: 'Edit product details',                   resource: 'products', is_sensitive: false },
  { name: PERMISSIONS.PRODUCTS_DELETE,     label: 'Delete products',                        resource: 'products', is_sensitive: true  },
  { name: PERMISSIONS.PRODUCTS_SET_PRICE,  label: 'Change cost or selling price',           resource: 'products', is_sensitive: true  },

  { name: PERMISSIONS.VARIANTS_VIEW,       label: 'View variants and stock details',         resource: 'variants', is_sensitive: false },
  { name: PERMISSIONS.VARIANTS_CREATE,     label: 'Add new variants to a product',          resource: 'variants', is_sensitive: false },
  { name: PERMISSIONS.VARIANTS_UPDATE,     label: 'Edit variant attributes',                resource: 'variants', is_sensitive: false },
  { name: PERMISSIONS.VARIANTS_DELETE,     label: 'Remove a variant permanently',           resource: 'variants', is_sensitive: true  },

  { name: PERMISSIONS.STOCK_VIEW,          label: 'View stock levels and entry history',    resource: 'stock',    is_sensitive: false },
  { name: PERMISSIONS.STOCK_ADD,           label: 'Record new stock from a supplier',       resource: 'stock',    is_sensitive: false },
  { name: PERMISSIONS.STOCK_ADJUST,        label: 'Correct a stock count for damage/loss',  resource: 'stock',    is_sensitive: true  },
  { name: PERMISSIONS.STOCK_SET_THRESHOLD, label: 'Set the low stock alert level',          resource: 'stock',    is_sensitive: true  },

  { name: PERMISSIONS.SALES_PROCESS,       label: 'Process in-store sales',                 resource: 'sales',    is_sensitive: false },
  { name: PERMISSIONS.SALES_VIEW,          label: 'View sales history',                     resource: 'sales',    is_sensitive: false },
  { name: PERMISSIONS.SALES_DISCOUNT,      label: 'Apply a discount to a sale',             resource: 'sales',    is_sensitive: true  },
  { name: PERMISSIONS.SALES_VOID,           label: 'Void a completed sale',                  resource: 'sales',    is_sensitive: true  },
  { name: PERMISSIONS.SALES_RETURN,         label: 'Process a customer return',              resource: 'sales',    is_sensitive: true  },
  { name: PERMISSIONS.SALES_OVERRIDE_PRICE, label: 'Override the selling price on a sale',  resource: 'sales',    is_sensitive: true  },

  { name: PERMISSIONS.STAFF_VIEW,          label: 'View the list of staff members',         resource: 'staff',    is_sensitive: false },
  { name: PERMISSIONS.STAFF_CREATE,        label: 'Add a new staff account',                resource: 'staff',    is_sensitive: false },
  { name: PERMISSIONS.STAFF_UPDATE,        label: 'Edit a staff member\'s details or role', resource: 'staff',    is_sensitive: false },
  { name: PERMISSIONS.STAFF_DEACTIVATE,    label: 'Remove a staff member\'s login access',  resource: 'staff',    is_sensitive: true  },

  { name: PERMISSIONS.ROLES_VIEW,          label: 'View roles and their permissions',       resource: 'roles',    is_sensitive: false },
  { name: PERMISSIONS.ROLES_CREATE,        label: 'Create a new role',                      resource: 'roles',    is_sensitive: false },
  { name: PERMISSIONS.ROLES_UPDATE,        label: 'Edit an existing role\'s permissions',   resource: 'roles',    is_sensitive: false },
  { name: PERMISSIONS.ROLES_DELETE,        label: 'Remove a role',                          resource: 'roles',    is_sensitive: true  },

  { name: PERMISSIONS.REPORTS_VIEW,        label: 'View financial reports and analytics',   resource: 'reports',  is_sensitive: false },
  { name: PERMISSIONS.REPORTS_EXPORT,      label: 'Export report data to CSV or PDF',       resource: 'reports',  is_sensitive: false },

  { name: PERMISSIONS.SETTINGS_VIEW,        label: 'View business settings',                 resource: 'settings',    is_sensitive: false },
  { name: PERMISSIONS.SETTINGS_UPDATE,      label: 'Change business settings',               resource: 'settings',    is_sensitive: true  },

  { name: PERMISSIONS.CATEGORIES_VIEW,      label: 'View product categories',                resource: 'categories',  is_sensitive: false },
  { name: PERMISSIONS.CATEGORIES_MANAGE,    label: 'Create, edit and delete categories',     resource: 'categories',  is_sensitive: false },
];
