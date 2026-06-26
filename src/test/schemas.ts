/**
 * Runtime Yup schemas that mirror the frontend TypeScript types in
 * src/client/common/types/index.ts. Tests in this directory validate that
 * every API response satisfies both the schema (runtime) and the TS type
 * (compile-time via the type assertions in each test file).
 *
 * When a field is added to a frontend type it must also be added here and the
 * backend must return it — otherwise tests break and the contract is enforced.
 */
import * as Yup from 'yup';

// ─── CurrentUser ────────────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → CurrentUser
export const currentUserSchema = Yup.object({
  id: Yup.string().uuid('id must be a UUID').required(),
  name: Yup.string().required(),
  email: Yup.string().email().required(),
  // phone and role_id are declared optional on the User model; absent when null
  phone: Yup.string().nullable().optional(),
  is_owner: Yup.boolean().required(),
  is_active: Yup.boolean().required(),
  must_change_password: Yup.boolean().required(),
  role_id: Yup.string().nullable().optional(),
}).required();

// ─── Product ─────────────────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → Product
export const productSchema = Yup.object({
  id: Yup.string().uuid().required(),
  name: Yup.string().required(),
  category: Yup.string().required(),
  // brand/description declared as optional on Product model; absent in JSON when null
  brand: Yup.string().nullable().optional(),
  description: Yup.string().nullable().optional(),
  created_at: Yup.string().required(),
}).required();

// ─── Paginated products list ──────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → PaginatedProducts
// Note: pagination is INSIDE data, not at the response root
export const paginatedProductsSchema = Yup.object({
  products: Yup.array().of(productSchema).required(),
  total: Yup.number().required(),
  page: Yup.number().required(),
  limit: Yup.number().required(),
}).required();

// ─── ProductVariant ──────────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → ProductVariant
// stock starts at 0 on creation; cost_price/selling_price are decimal strings
export const productVariantSchema = Yup.object({
  id: Yup.string().uuid().required(),
  product_id: Yup.string().uuid().required(),
  sku: Yup.string().nullable().optional(),
  cost_price: Yup.string().required(),
  selling_price: Yup.string().required(),
  stock: Yup.number().required(),
  low_stock_threshold: Yup.number().required(),
  is_active: Yup.boolean().required(),
  created_at: Yup.string().required(),
}).required();

// ─── Setting ─────────────────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → Setting
export const settingSchema = Yup.object({
  id: Yup.string().uuid().required(),
  name: Yup.string().required(),
  label: Yup.string().required(),
  value: Yup.string().required(),
  group: Yup.string().required(),
  editable: Yup.boolean().required(),
}).required();

// ─── Sale ────────────────────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → Sale
// Note: the total is `amount_due` (not total_amount)
export const saleSchema = Yup.object({
  id: Yup.string().uuid().required(),
  sale_number: Yup.string().required(),
  payment_method: Yup.string().oneOf(['cash', 'momo']).required(),
  payment_status: Yup.string().required(),
  amount_due: Yup.string().required(),
  amount_tendered: Yup.string().nullable().defined(),
  change_given: Yup.string().nullable().defined(),
  discount: Yup.string().required(),
  created_at: Yup.string().required(),
}).required();

// ─── Paginated sales list ─────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → PaginatedSales
export const paginatedSalesSchema = Yup.object({
  sales: Yup.array().of(saleSchema).required(),
  total: Yup.number().required(),
  page: Yup.number().required(),
  limit: Yup.number().required(),
}).required();

// ─── Role ─────────────────────────────────────────────────────────────────────
export const roleSchema = Yup.object({
  id: Yup.string().uuid().required(),
  name: Yup.string().required(),
  created_at: Yup.string().required(),
}).required();

// ─── StockHealthData ──────────────────────────────────────────────────────────
// Mirrors: src/client/common/types/index.ts → StockHealthData
// Returned by GET /api/reports/stock-health
export const stockHealthSchema = Yup.object({
  total:          Yup.number().integer().min(0).required(),
  healthy:        Yup.number().integer().min(0).required(),
  lowStock:       Yup.number().integer().min(0).required(),
  outOfStock:     Yup.number().integer().min(0).required(),
  inventoryValue: Yup.number().min(0).required(),
}).required();

// ─── Reports summary ──────────────────────────────────────────────────────────
// Returned by GET /api/reports/summary?period=*
// Hook extracts: data.revenue → DashSummary.totalSales
export const reportsSummarySchema = Yup.object({
  period:        Yup.string().required(),
  from:          Yup.string().required(),
  to:            Yup.string().required(),
  revenue:       Yup.number().required(),
  cost:          Yup.number().required(),
  profit:        Yup.number().required(),
  marginPercent: Yup.number().required(),
  salesCount:    Yup.number().integer().required(),
  unitsSold:     Yup.number().integer().required(),
}).required();

// ─── Chart data ───────────────────────────────────────────────────────────────
// Returned by GET /api/reports/chart?period=*&metric=*
// Hook extracts: data.labels, data.values → DashSummary.chart
export const chartSchema = Yup.object({
  labels: Yup.array().of(Yup.string().required()).required(),
  values: Yup.array().of(Yup.number().required()).required(),
}).required();

// ─── Top product item ─────────────────────────────────────────────────────────
// One element from GET /api/reports/top-products?period=*
// Hook extracts: item.productName, item.revenue → DashSummary.topItems
export const topProductSchema = Yup.object({
  productId:   Yup.string().uuid().required(),
  variantId:   Yup.string().uuid().required(),
  productName: Yup.string().required(),
  sku:         Yup.string().nullable().optional(),
  options:     Yup.string().nullable().optional(),
  unitsSold:   Yup.number().integer().required(),
  revenue:     Yup.number().required(),
}).required();

// ─── Profit breakdown item ────────────────────────────────────────────────────
// One element from GET /api/reports/profit?period=*&groupBy=*
// Hook extracts: item.group, item.revenue → DashSummary.categories
export const profitBreakdownItemSchema = Yup.object({
  group:   Yup.string().required(),
  revenue: Yup.number().required(),
  cost:    Yup.number().required(),
  profit:  Yup.number().required(),
  margin:  Yup.number().required(),
}).required();
