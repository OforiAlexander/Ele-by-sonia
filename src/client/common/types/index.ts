export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_owner: boolean;
  is_active: boolean;
  must_change_password: boolean;
  role_id?: string | null;
  role?: { id: string; name: string; permissions?: Array<{ name: string }> };
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
}

export interface ApiResponse<T = unknown> {
  code: string;
  data?: T;
  errors?: Array<{ msg: string; path?: string }>;
}

// Paginated lists embed pagination inside data, not in a separate meta field
export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedSales {
  sales: Sale[];
  total: number;
  page: number;
  limit: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  cost_price: string;
  selling_price: string;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  options?: Array<{ type: string; value: string }>;
}

// Cart item held in POS page state (frontend-only, never sent to backend)
export interface CartItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  price: number;
  quantity: number;
}

// Shape of a completed sale returned by POST /api/sales and GET /api/sales/:id
export interface Sale {
  id: string;
  sale_number: string;
  payment_method: 'cash' | 'momo';
  payment_status: string;
  amount_due: string;
  amount_tendered: string | null;
  change_given: string | null;
  discount: string;
  created_at: string;
}

export interface Setting {
  id: string;
  name: string;
  label: string;
  value: string;
  group: string;
  editable: boolean;
}
