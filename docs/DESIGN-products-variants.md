# Design Plan — ProductsPage + VariantsPage

**Branch:** `SCRUM-8-design-login-dashboard` (owner's branch)  
**Routes:** `/inventory/products` and `/inventory/variants?productId=xxx`  
**Backend status:** Complete. All tests green. No backend changes permitted.

---

## Backend Contract Summary

### Products

| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| `GET` | `/api/products?page&limit` | `can_view_products` | Returns `{ products[], total, page, limit }` with `variants[]` and `images[]` embedded |
| `GET` | `/api/products/:id` | `can_view_products` | Single product with full relations |
| `POST` | `/api/products` | `can_create_products` | Body: `{ name, category, brand?, description? }` |
| `PUT` | `/api/products/:id` | `can_update_products` | Same body as POST |
| `DELETE` | `/api/products/:id` | `can_update_products` | **Deactivates — not a hard delete.** Returns updated product with `is_active: false` |
| `POST` | `/api/products/:id/images` | `can_update_products` | Multipart, field `images[]`, max 8 files. Backend resizes with sharp, uploads to S3 |
| `DELETE` | `/api/products/:id/images/:imageId` | `can_update_products` | Deletes from S3 |
| `POST` | `/api/products/import` | `can_create_products` | CSV upload, field `file` |

**Product response shape:**
```typescript
{
  id: string;
  name: string;
  category: string;
  brand: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  variants: ProductVariant[];     // always present on list and single
  images: ProductImage[];         // always present on list and single
}
```

### Variants + Options

| Method | Endpoint | Permission | Notes |
|---|---|---|---|
| `GET` | `/api/variants?productId=xxx` | `can_view_variants` | Flat array — no pagination |
| `GET` | `/api/variants/:id` | `can_view_variants` | Single variant |
| `POST` | `/api/variants` | `can_create_variants` | Body: `{ product_id, cost_price, selling_price, optionValueIds[], sku?, low_stock_threshold? }` |
| `PUT` | `/api/variants/:id` | `can_update_variants` | Same body + `is_active?`. Replaces all option values |
| `DELETE` | `/api/variants/:id` | `can_delete_variants` | Hard delete |
| `GET` | `/api/variants/option-types?productId=xxx` | `can_view_variants` | Returns `[{ id, name, values: [{id, value}] }]` |
| `POST` | `/api/variants/option-types` | `can_create_variants` | Body: `{ product_id, name }` |
| `DELETE` | `/api/variants/option-types/:id` | `can_delete_variants` | Blocked if values in use |
| `POST` | `/api/variants/option-types/:id/values` | `can_create_variants` | Body: `{ value }` |
| `DELETE` | `/api/variants/option-values/:id` | `can_delete_variants` | Blocked if used by a variant |

**Variant response shape:**
```typescript
{
  id: string;
  product_id: string;
  sku: string | null;
  cost_price: string;        // decimal string — use parseFloat() for arithmetic
  selling_price: string;     // decimal string — use parseFloat() for arithmetic
  stock: number;             // integer
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  optionValues: Array<{
    id: string;
    value: string;
    optionType: { id: string; name: string };
  }>;
}
```

### Stock

| Method | Endpoint | Permission | Body | Returns |
|---|---|---|---|---|
| `POST` | `/api/stock/add` | `can_add_stock` | `{ variant_id, quantity (≥1), note? }` | `{ code: STOCK_ADDED, data: ProductVariant }` |
| `POST` | `/api/stock/adjust` | `can_adjust_stock` | `{ variant_id, quantity (signed ≠0), note (required) }` | `{ code: STOCK_ADJUSTED, data: ProductVariant }` |
| `PATCH` | `/api/stock/threshold/:variantId` | `can_set_threshold` | `{ low_stock_threshold (≥0) }` | `{ code: THRESHOLD_UPDATED, data: ProductVariant }` |
| `GET` | `/api/stock?variantId=xxx` | `can_view_stock` | — | Array of `StockEntry` |

**Critical:** `POST /api/stock/adjust` will return `400 STOCK_INSUFFICIENT` if `current_stock + quantity < 0`. The UI must show this error clearly — do not suppress it.

---

## ProductsPage — Component Design

### Page layout

```
┌──────────────────────────────────────────────────────┐
│  Products                        [+ Add Product]      │
│  Manage your inventory catalogue                      │
├──────────────────────────────────────────────────────┤
│  [Search by name or category...]  [Active ▾] [Clear] │
├──────────────────────────────────────────────────────┤
│  NAME          CATEGORY   BRAND   VARIANTS  STATUS   │
│  ─────────────────────────────────────────────────── │
│  Silk Dress    Dresses    EBS     3 variants ● Active │
│                                   [Variants] [Edit]   │
│  ...                                                  │
├──────────────────────────────────────────────────────┤
│  ← 1 2 3 →   Showing 1–50 of 120                    │
└──────────────────────────────────────────────────────┘
```

### Table columns

| Column | Source | Notes |
|---|---|---|
| Name | `product.name` | Clickable — opens edit drawer |
| Category | `product.category` | Plain text |
| Brand | `product.brand ?? '—'` | Plain text |
| Variants | `product.variants.length` | Number badge |
| Stock status | Derived from `product.variants` | See badge logic below |
| Active | `product.is_active` | Green / red Mantine `Badge` |
| Actions | — | Variants button + Edit icon + Deactivate icon |

**Stock status badge derivation:**
```typescript
function stockStatus(variants: ProductVariant[]): 'out' | 'low' | 'healthy' | 'none' {
  const active = variants.filter(v => v.is_active);
  if (active.length === 0) return 'none';
  if (active.some(v => v.stock === 0)) return 'out';
  if (active.some(v => v.stock <= v.low_stock_threshold)) return 'low';
  return 'healthy';
}
```
- `out` → red badge "Out of Stock"
- `low` → amber badge "Low Stock"
- `healthy` → green badge "In Stock"
- `none` → grey badge "No Variants"

### Add / Edit product — Mantine `Drawer` from right

Fields (Formik + Yup):
```typescript
const schema = Yup.object({
  name:        Yup.string().required(t(KEYS.products.validation.nameRequired)),
  category:    Yup.string().required(t(KEYS.products.validation.categoryRequired)),
  brand:       Yup.string().optional(),
  description: Yup.string().optional(),
});
```

- On create: `POST /api/products` → on 201, close drawer, refetch list
- On edit: `PUT /api/products/:id` → on 200, close drawer, refetch list

### Image section (inside Edit drawer only)

- Show `product.images` as a 4-column thumbnail grid
- Each thumbnail: 80×80px, `image_path` as `src`, delete button (×) overlay on hover
- Delete: `DELETE /api/products/:id/images/:imageId` → remove from local state on 200
- Upload: `<input type="file" multiple accept="image/*">` → `POST /api/products/:id/images` with `FormData`, field name `images`
- Max 8 total. Show count badge: "3 / 8 images"
- Backend resizes before S3 — show the returned `image_path` as the thumbnail URL directly

### Deactivate action

```typescript
const result = await showConfirm(
  t(KEYS.products.deactivateTitle),
  t(KEYS.products.deactivateText),
);
if (result.isConfirmed) {
  await api.delete(`/products/${id}`);
  // refetch list — product stays visible with is_active: false badge
}
```

### Permission gates

```typescript
const { user } = useAuth();
const canCreate   = user.is_owner || user.can_create_products;
const canUpdate   = user.is_owner || user.can_update_products;
const canDelete   = user.is_owner || user.can_delete_products;
const canViewStock = user.is_owner || user.can_view_stock;
```

---

## VariantsPage — Component Design

**URL:** `/inventory/variants?productId=xxx`  
Read `productId` from `useSearchParams()`. Fetch `GET /api/products/:productId` for the product name.

### Page layout

```
┌──────────────────────────────────────────────────────┐
│  ← Products / Silk Dress                             │
│  Variants                   [+ Add Variant]          │
│  Manage sizes, colours and stock for this product    │
├─────────────────────────────┬────────────────────────┤
│  OPTION TYPES               │  VARIANTS TABLE        │
│  ─────────────────          │  ─────────────────     │
│  Size                       │  SKU | Options | Cost  │
│  [S] [M] [L] [XL] [+ Add]  │  | Price | Stock | ... │
│  [Delete type]              │                        │
│                             │                        │
│  Colour                     │                        │
│  [Red] [Blue] [+ Add]       │                        │
│  [Delete type]              │                        │
│                             │                        │
│  [+ Add Option Type]        │                        │
└─────────────────────────────┴────────────────────────┘
```

### Option types panel (left column)

- Fetch: `GET /api/variants/option-types?productId=xxx`
- Each type shows its values as Mantine `Badge` chips in a row
- **Add Option Type:** inline `TextInput` + submit → `POST /api/variants/option-types`
- **Add value:** click `+` next to a type → inline input → `POST /api/variants/option-types/:id/values`
- **Delete value:** × on badge → SweetAlert2 confirm → `DELETE /api/variants/option-values/:id`
  - If `400 IN_USE`, show SweetAlert2 error "This value is used by an existing variant"
- **Delete type:** trash icon → SweetAlert2 confirm → `DELETE /api/variants/option-types/:id`
  - If `400 IN_USE`, show error "Cannot delete — values are in use"

### Variants table (right / main area)

Columns:

| Column | Source | Notes |
|---|---|---|
| SKU | `variant.sku ?? '—'` | — |
| Options | Derived | `variant.optionValues.map(v => v.value).join(' / ')` |
| Cost Price | `parseFloat(variant.cost_price)` | Format as GHS |
| Selling Price | `parseFloat(variant.selling_price)` | Format as GHS |
| Stock | `variant.stock` | Number; red if `stock === 0`, amber if `≤ low_stock_threshold` |
| Threshold | `variant.low_stock_threshold` | Inline editable — see below |
| Active | `variant.is_active` | Toggle switch |
| Actions | — | Edit, Stock Add, Adjust, History, Delete |

### Add / Edit variant — Mantine `Modal`

```typescript
const schema = Yup.object({
  sku:               Yup.string().optional(),
  cost_price:        Yup.number().positive().required(),
  selling_price:     Yup.number().positive().required(),
  low_stock_threshold: Yup.number().integer().min(0).optional(),
  // One Select per option type:
  // optionValues: { [optionTypeId]: optionValueId }
});
```

Build `optionValueIds[]` from the selects: `Object.values(optionValues)`.

- Create: `POST /api/variants` with `{ product_id, cost_price, selling_price, optionValueIds, sku, low_stock_threshold }`
- Edit: `PUT /api/variants/:id` with same body
- After 201/200: close modal, refetch variants list

### Stock Add modal

```typescript
// Opened from "Add Stock" button per variant row
Yup.object({
  quantity: Yup.number().integer().min(1).required(),
  note:     Yup.string().optional(),
})
// Submit → POST /api/stock/add { variant_id, quantity, note }
// Show updated stock in success message: "Stock updated to 25 units"
```

### Stock Adjust modal

```typescript
// Opened from "Adjust" button — for corrections and write-offs
Yup.object({
  quantity: Yup.number().integer().not([0]).required(),  // signed, non-zero
  note:     Yup.string().required(),                     // mandatory for audit trail
})
// Submit → POST /api/stock/adjust { variant_id, quantity, note }
// Handle 400 STOCK_INSUFFICIENT: showError("Cannot adjust", "Stock cannot go below zero")
```

### Inline threshold editor

Click threshold value → small inline `NumberInput` → blur or Enter → `PATCH /api/stock/threshold/:variantId`

### Stock history panel

Small Mantine `Drawer` or `Popover` listing `GET /api/stock?variantId=xxx`:
- Each entry: quantity (+ or −), note, `createdByUser.name`, `created_at`
- Opened from "History" icon per row

### Active toggle

Toggle switch → `PUT /api/variants/:id` with `is_active: !variant.is_active`, all other fields from current variant.  
No confirm needed for toggle.

### Delete variant

`DELETE /api/variants/:id` with SweetAlert2 confirm. Hard delete — cannot be undone.

---

## Shared Utilities to Build

### `src/client/common/utils/currency.ts`
```typescript
export function formatGHS(amount: number | string): string {
  return `GHS ${parseFloat(String(amount)).toFixed(2)}`;
}
```

### `src/client/common/hooks/useProducts.ts`
```typescript
export function useProducts(page: number, limit: number) { ... }
// Calls GET /api/products?page&limit
// Returns { products, total, loading, refetch }
```

### `src/client/common/hooks/useVariants.ts`
```typescript
export function useVariants(productId: string) { ... }
// Calls GET /api/variants?productId=xxx
// Returns { variants, optionTypes, loading, refetch }
```

---

## Translation Keys to Add

```typescript
// In src/client/common/keys.tsx
products: {
  title:             'products.title',
  subtitle:          'products.subtitle',
  addButton:         'products.addButton',
  editTitle:         'products.editTitle',
  createTitle:       'products.createTitle',
  deactivateTitle:   'products.deactivateTitle',
  deactivateText:    'products.deactivateText',
  nameLabel:         'products.nameLabel',
  categoryLabel:     'products.categoryLabel',
  brandLabel:        'products.brandLabel',
  descriptionLabel:  'products.descriptionLabel',
  images:            'products.images',
  noVariants:        'products.noVariants',
  validation: {
    nameRequired:     'products.validation.nameRequired',
    categoryRequired: 'products.validation.categoryRequired',
  },
},
variants: {
  title:             'variants.title',
  subtitle:          'variants.subtitle',
  addButton:         'variants.addButton',
  skuLabel:          'variants.skuLabel',
  costLabel:         'variants.costLabel',
  priceLabel:        'variants.priceLabel',
  stockLabel:        'variants.stockLabel',
  thresholdLabel:    'variants.thresholdLabel',
  optionsLabel:      'variants.optionsLabel',
  addStockTitle:     'variants.addStockTitle',
  adjustTitle:       'variants.adjustTitle',
  adjustNoteLabel:   'variants.adjustNoteLabel',
  deleteConfirm:     'variants.deleteConfirm',
  insufficientStock: 'variants.insufficientStock',
  optionTypes:       'variants.optionTypes',
  addOptionType:     'variants.addOptionType',
  addValue:          'variants.addValue',
},
```

---

## File Structure to Create

```
src/client/portals/inventory/
  pages/
    ProductsPage.tsx          ← main page
    VariantsPage.tsx          ← main page

  components/
    products/
      ProductDrawer.tsx       ← Add/Edit drawer with image section
      ProductTable.tsx        ← Mantine Table with all columns
      ImageUpload.tsx         ← thumbnail grid + file input
    variants/
      VariantModal.tsx        ← Add/Edit modal
      VariantTable.tsx        ← Mantine Table with inline threshold
      OptionTypesPanel.tsx    ← Left column: types and values management
      StockAddModal.tsx       ← POST /api/stock/add
      StockAdjustModal.tsx    ← POST /api/stock/adjust
      StockHistoryDrawer.tsx  ← GET /api/stock?variantId=

src/client/common/
  utils/
    currency.ts               ← formatGHS()
  hooks/
    useProducts.ts
    useVariants.ts
```

---

## Definition of Done

### ProductsPage
- [ ] Table renders with all columns including derived stock status badge
- [ ] Pagination sends correct `page` and `limit` params
- [ ] Add Product drawer opens, validates with Yup, submits `POST /api/products`
- [ ] Edit drawer pre-fills all fields, submits `PUT /api/products/:id`
- [ ] Image upload sends multipart to `POST /api/products/:id/images`
- [ ] Image delete calls `DELETE /api/products/:id/images/:imageId`
- [ ] Deactivate shows SweetAlert2 confirm, calls `DELETE /api/products/:id`
- [ ] Deactivated product stays in table with `is_active: false` badge
- [ ] All permission flags respected
- [ ] All text uses `t(KEYS.products.*)` — zero raw string literals

### VariantsPage
- [ ] URL reads `productId` from `useSearchParams()`
- [ ] Breadcrumb shows correct product name
- [ ] Option types panel: create type, add value, delete value/type with IN_USE error handling
- [ ] Variant table renders SKU, options string, prices (GHS), stock colour-coded, threshold, active toggle
- [ ] Add Variant modal builds `optionValueIds[]` from per-type selects
- [ ] Edit Variant pre-fills and re-submits
- [ ] Stock Add modal: positive quantity, calls `POST /api/stock/add`
- [ ] Stock Adjust modal: signed quantity + required note, handles `400 STOCK_INSUFFICIENT`
- [ ] Inline threshold saves on blur/Enter via `PATCH /api/stock/threshold/:variantId`
- [ ] Active toggle calls `PUT /api/variants/:id` with flipped `is_active`
- [ ] Stock history drawer shows entries with `createdByUser.name`
- [ ] All permission flags respected
- [ ] All text uses `t(KEYS.variants.*)` — zero raw string literals

### Both
- [ ] `npx tsc --noEmit` produces zero errors
- [ ] `yarn test:align` passes green (no new align tests needed — existing ones cover all endpoints)
