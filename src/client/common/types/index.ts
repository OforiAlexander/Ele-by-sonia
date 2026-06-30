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
  can_override_price?: boolean;
  can_verify_payment?: boolean;
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
  can_view_categories?: boolean;
  can_manage_categories?: boolean;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

export interface ApiResponse<T = unknown> {
  code: string;
  message?: string;
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

export interface ProductImage {
  id: string;
  image_path: string;
  sort_order: number;
}

export interface ProductOptionValue {
  id: string;
  option_type_id: string;
  value: string;
}

export interface ProductOptionType {
  id: string;
  product_id: string;
  name: string;
  values: ProductOptionValue[];
}

export interface StockEntry {
  id: string;
  variant_id: string;
  quantity: number;
  note: string | null;
  created_at: string;
  createdByUser: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariantOptionValue {
  id: string;
  option_type_id: string;
  value: string;
  optionType?: { id: string; name: string };
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
  optionValues?: ProductVariantOptionValue[];
}

export interface SearchVariantResult {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  cost_price: string;
  selling_price: string;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  optionValues: ProductVariantOptionValue[];
}

export interface CartItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  price: number;
  quantity: number;
}

export interface SaleLineItem {
  id: string;
  sale_id: string;
  variant_id: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  cost_price_snapshot: string;
  original_price?: string | null;
  price_override?: string | null;
  variant?: { id: string; sku: string | null; product_id: string; product_name?: string };
}

export interface Sale {
  id: string;
  sale_number: string;
  payment_method: 'cash' | 'momo' | 'split';
  payment_status: string;
  amount_due: string;
  amount_tendered: string | null;
  change_given: string | null;
  discount: string;
  levy_amount?: string;
  vat_amount?: string;
  nhil_amount?: string;
  getfund_amount?: string;
  covid_levy_amount?: string;
  voided_at?: string | null;
  created_at: string;
  customer_phone?: string | null;
  paystack_reference?: string | null;
  momo_provider?: string | null;
  items?: SaleLineItem[];
  staff?: { id: string; name: string };
}

export interface TransactionStats {
  totalCount:   number;
  cashTotal:    number;
  momoTotal:    number;
  pendingTotal: number;
}

export interface PosCartItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  originalPrice: number;
  price: number;
  quantity: number;
  unitPriceOverride: number | null;
}

// Held sale saved to localStorage
export interface HeldCart {
  id: string;
  label: string;
  items: PosCartItem[];
  savedAt: number;
}

export interface AppSetting {
  id: string;
  name: string;
  label: string;
  value: string;
  group: string;
  editable: boolean;
  type: 'string' | 'textarea' | 'boolean' | 'number' | 'time' | 'enum';
  unit: string | null;
  hint: string | null;
  options: string[] | null;
  min: number | null;
  max: number | null;
  restart_required: boolean;
}

export type PublicSettings = Record<string, string>;

export interface StockHealthData {
  healthy:        number;
  lowStock:       number;
  outOfStock:     number;
  total:          number;
  inventoryValue: number;
}

export interface DashSummary {
  totalProducts:  number;
  totalSales:     number;
  topSellingItem: string;
  chart:          { labels: string[]; values: number[] };
  topItems:       { name: string; revenue: number }[];
  categories:     { name: string; revenue: number }[];
}

export interface ReportSummary {
  period:        string;
  from:          string;
  to:            string;
  revenue:       number;
  cost:          number;
  profit:        number;
  marginPercent: number;
  salesCount:    number;
  unitsSold:     number;
}

export interface ProfitBreakdownItem {
  group:   string;
  revenue: number;
  cost:    number;
  profit:  number;
  margin:  number;
}

export interface TopProduct {
  variantId:   string;
  productName: string;
  sku:         string | null;
  options:     string | null;
  unitsSold:   number;
  revenue:     number;
}

export interface ReportChartData {
  labels: string[];
  values: number[];
}

export interface TaxBreakdown {
  period:    string;
  from:      string;
  to:        string;
  vat:       number;
  nhil:      number;
  getfund:   number;
  covidLevy: number;
  levy:      number;
  totalTax:  number;
}

export interface StockMovementEntry {
  id:          string;
  productName: string;
  sku:         string | null;
  quantity:    number;
  note:        string | null;
  staffName:   string;
  createdAt:   string;
}

export interface StockMovementsReport {
  period:       string;
  from:         string;
  to:           string;
  totalAdded:   number;
  totalRemoved: number;
  entryCount:   number;
  entries:      StockMovementEntry[];
}

export interface ReturnsByStaff {
  staffId:   string;
  staffName: string;
  count:     number;
  total:     number;
}

export interface ReturnsReport {
  period:      string;
  from:        string;
  to:          string;
  returnCount: number;
  returnTotal: number;
  byStaff:     ReturnsByStaff[];
}

export interface ActivityLogEntry {
  id:         string;
  action:     string;
  entityType: string;
  entityId:   string;
  before:     Record<string, unknown> | null;
  after:      Record<string, unknown> | null;
  createdAt:  string;
  userId:     string;
  userName:   string;
}

export interface ActivityLog {
  logs:  ActivityLogEntry[];
  total: number;
  page:  number;
  limit: number;
}

export interface Reconciliation {
  period:            string;
  from:              string;
  to:                string;
  cashCount:         number;
  cashTotal:         number;
  momoCount:         number;
  momoTotal:         number;
  totalRevenue:      number;
  totalTransactions: number;
  unitsSold:         number;
  cogsTotal:         number;
  grossProfit:       number;
  discountTotal:     number;
  returnCount:       number;
  returnTotal:       number;
  voidCount:         number;
  voidTotal:         number;
  levyTotal:         number;
  netCashExpected:   number;
}

export interface StaffMember {
  id:                   string;
  name:                 string;
  email:                string;
  phone:                string | null;
  is_owner:             boolean;
  is_active:            boolean;
  must_change_password: boolean;
  role_id:              string | null;
  role?:                { id: string; name: string };
  created_at:           string;
}

export interface Permission {
  id:           string;
  name:         string;
  label:        string;
  is_sensitive: boolean;
}

export interface Role {
  id:           string;
  name:         string;
  permissions?: Permission[];
}

export interface AppNotification {
  id:         string;
  user_id:    string;
  type:       string;
  title:      string;
  body:       string | null;
  data:       Record<string, unknown> | null;
  read_at:    string | null;
  created_at: string;
}

export interface ImportResult {
  productsCreated: number;
  variantsCreated: number;
  skipped:         number;
  errors:          number;
  errorDetails:    Array<{ row: number; product_name: string; reason: string }>;
  skippedDetails:  Array<{ row: number; product_name: string; reason: string }>;
}
