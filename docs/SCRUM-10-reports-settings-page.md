# SCRUM-10 — Design Reports Page and Settings Page

**Jira:** SCRUM-10  
**Assignee:** (see Jira)  
**Branch:** `SCRUM-10-design-reportspage-and-settings-page`  
**First commit:** `git commit -m "SCRUM-10 design reportspage and settings page"`

---

## Git Setup

```bash
git checkout main
git pull origin main
git checkout -b SCRUM-10-design-reportspage-and-settings-page
# Do your first commit with exactly this message:
git commit -m "SCRUM-10 design reportspage and settings page"
```

All subsequent commits on this branch must follow conventional commit format:

```
feat: add period selector to reports page
fix: chart not re-fetching on period change
```

**Do not push to main. Do not open a PR without review.**

---

## Scope

You are building **two pages**:

1. `src/client/portals/inventory/pages/ReportsPage.tsx`
2. `src/client/portals/inventory/pages/SettingsPage.tsx`

You may also create sub-components inside:
- `src/client/portals/inventory/components/reports/`
- `src/client/portals/inventory/components/settings/`

You are not building anything else. Do not touch any other page, route, or shared component.

---

## CRITICAL — Backend Is Off Limits

> **You must not modify any file under `src/server/`.  
> You must not modify any database migration file.  
> You must not add, rename, or remove any API endpoint.  
> You must not modify any backend model, service, controller, or middleware.**

All five report endpoints and both settings endpoints are complete, tested, and have alignment tests already passing. Your only job is to build the UI that consumes them. If you think an endpoint is wrong, raise it in Slack — do not change it.

---

## PART 1 — Reports Page

### What You Are Building

A reporting dashboard that allows the owner and staff with `can_view_reports` to view business performance data across configurable time periods.

The page has:
1. **Period selector** — user picks a period; all data on the page refreshes
2. **Summary KPIs** — revenue, cost, profit, margin %, sales count, units sold
3. **Revenue/profit/units chart** — line or bar chart, metric switchable
4. **Top products table** — up to 10 best-selling variants by revenue
5. **Profit breakdown** — groupable by category, product, or payment method
6. **Stock health widget** — total variants, healthy / low stock / out of stock counts

---

### Period Selector

The backend accepts exactly these five values. Your UI must map to them exactly:

| Display label | Value to send |
|---|---|
| Today | `daily` |
| This Week | `weekly` |
| This Month | `monthly` |
| This Quarter | `quarterly` |
| This Year | `annual` |

All report endpoints accept an optional `date` query param (`YYYY-MM-DD`) to anchor the period to a specific date. For now, omit it — the backend defaults to today.

---

### API Endpoints — Reports

#### 1. Summary

```
GET /api/reports/summary?period={period}

Response:
{
  code: "OK",
  data: {
    period: string         // e.g. "annual"
    from: string           // YYYY-MM-DD
    to: string             // YYYY-MM-DD
    revenue: number        // total sales revenue
    cost: number           // total cost of goods sold
    profit: number         // revenue - cost
    marginPercent: number  // profit as % of revenue, 1 decimal place
    salesCount: number     // number of completed sales transactions
    unitsSold: number      // total units across all sales
  }
}
```

---

#### 2. Chart data

```
GET /api/reports/chart?period={period}&metric={metric}

metric values: "revenue" | "profit" | "units"
Default metric: "revenue"

Response:
{
  code: "OK",
  data: {
    labels: string[]   // time bucket labels (e.g. ["Jan", "Feb", ...] for annual)
    values: number[]   // matching values array, same length as labels
  }
}
```

For annual period, `labels` will always have 12 entries (Jan–Dec).  
For monthly period, `labels` will have one entry per day of the month.  
For daily period, `labels` will have 24 entries (0–23 hours).

**Use Chart.js (`react-chartjs-2`) for the chart — this is the committed charting library. Do not use Recharts, Victory, or any other library.**

---

#### 3. Top products

```
GET /api/reports/top-products?period={period}&limit=10

Response:
{
  code: "OK",
  data: Array<{
    productId: string
    variantId: string
    productName: string
    sku: string | null
    options: string | null    // e.g. "M / Red" — pre-formatted by backend
    unitsSold: number
    revenue: number
  }>
}
```

---

#### 4. Profit breakdown

```
GET /api/reports/profit?period={period}&groupBy={groupBy}

groupBy values: "category" | "product" | "payment_method"
Default: "category"

Response:
{
  code: "OK",
  data: Array<{
    group: string      // category name, product name, or "cash"/"momo"
    revenue: number
    cost: number
    profit: number
    margin: number     // profit % of revenue, 1 decimal place
  }>
}
```

---

#### 5. Stock health

```
GET /api/reports/stock-health
(No query params — this is always the current snapshot)

Response:
{
  code: "OK",
  data: {
    total: number          // total active variants
    healthy: number        // stock > low_stock_threshold
    lowStock: number       // 0 < stock <= threshold
    outOfStock: number     // stock = 0
    inventoryValue: number // sum of (stock × cost_price) across all active variants
  }
}
```

**Invariant:** `healthy + lowStock + outOfStock === total`. You can use this as an assertion in the alignment test.

---

### Chart.js Setup

Chart.js must be registered before use. If it is not already registered in the inventory portal's entry file, register it in the component that uses it:

```typescript
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);
```

Use `<Bar>` or `<Line>` from `react-chartjs-2`. The chart container must have a defined height — use the `.chart-container` class already in `portal.scss` (height: 210px).

---

### Permission Gates — Reports

| Action | Flag to check |
|---|---|
| See the page | `can_view_reports` |
| Export (future) | `can_export_reports` |

Read the `user` object from `useAuth()`. Owner (`user.is_owner === true`) bypasses all checks.

---

## PART 2 — Settings Page

### What You Are Building

A settings management page for the owner. Staff without `can_view_settings` must not see this page.

The page shows all settings grouped by their `group` value and allows the owner to edit settings that have `editable: true`. Settings with `editable: false` are displayed read-only with a clear visual indicator that they cannot be changed.

---

### Settings in the System

There are currently 8 settings across 4 groups. **Do not hardcode these** — always fetch from the API and render dynamically.

| Name | Label | Group | Editable |
|---|---|---|---|
| `BUSINESS_NAME` | Business display name | general | yes |
| `BUSINESS_PHONE` | Business contact phone | general | yes |
| `BUSINESS_EMAIL` | Business contact email | general | yes |
| `LOW_STOCK_DEFAULT_THRESHOLD` | Default low stock warning level | inventory | yes |
| `LOW_STOCK_ALERT_ENABLED` | Send email when stock hits threshold | inventory | yes |
| `SALE_NUMBER_PREFIX` | Prefix for sale reference numbers | inventory | **no** |
| `PAYSTACK_CURRENCY` | Currency code for Paystack | payments | **no** |
| `ORDER_NUMBER_PREFIX` | Prefix for online order numbers | ecommerce | **no** |

**Never attempt to edit a setting with `editable: false`.** The backend will reject it with `400 NOT_EDITABLE`. The UI must not show an edit control for these.

---

### API Endpoints — Settings

#### List all settings

```
GET /api/settings

Response:
{
  code: "OK",
  data: Array<{
    id: string
    name: string       // e.g. "BUSINESS_NAME"
    label: string      // human-readable label
    value: string      // current value (always a string)
    group: string      // "general" | "inventory" | "payments" | "ecommerce"
    editable: boolean
  }>
}
```

---

#### Update a setting

```
PUT /api/settings/:name
Content-Type: application/json

Body:
{
  value: string   // required, non-empty
}

Success response:
{
  code: "OK",
  data: {
    updated: Setting,
    oldValue: string
  }
}

Error responses:
  400 NOT_EDITABLE — attempted to edit a read-only setting
  404 NOT_FOUND   — setting name does not exist
  422             — value field missing
```

**The `:name` param is the setting's `name` field** (e.g., `PUT /api/settings/BUSINESS_NAME`), not its `id`.

---

### Design Guidance — Settings

- Group settings visually by their `group` value with a section heading per group
- Editable settings: show the current value in a `TextInput` with a Save button per row, or open a small edit modal — your choice, but use Mantine components
- Non-editable settings: show the value as plain read-only text with a lock icon or "System managed" label
- After a successful update, refresh the list (re-fetch from API) so the displayed value reflects what was saved

---

### Permission Gates — Settings

| Action | Flag to check |
|---|---|
| See the page | `can_view_settings` |
| Edit a setting | `can_update_settings` |

Even if `can_view_settings` is true, hide or disable edit controls if `can_update_settings` is false.

---

## Technology Rules — Non-Negotiable (Both Pages)

These are committed project decisions. Do not introduce alternatives.

| Concern | Required | Forbidden |
|---|---|---|
| UI components | **Mantine UI** | Radix UI, raw custom components |
| Forms | **Formik + Yup** | react-hook-form |
| Alerts / confirmations | **SweetAlert2** | `window.confirm()`, Mantine notifications |
| HTTP calls | **Axios via `api`** | `fetch`, a new axios instance |
| Charts | **Chart.js / react-chartjs-2** | Recharts, Victory, Nivo, any other chart lib |
| Language | **TypeScript strict mode** | JavaScript, `any` without justification |

```typescript
import api from '@client/common/api';   // always use this, never create a new axios instance
```

---

## Translation Keys — Mandatory

**Every user-visible string must come from the translation system. No raw string literals in JSX — no exceptions.**

Add keys to `src/client/common/keys.tsx`:
```typescript
reports: {
  title: 'reports.title',
  periodLabel: 'reports.periodLabel',
  // ...
},
settings: {
  title: 'settings.title',
  // ...
}
```

Add English values to `src/client/common/translations.tsx`:
```typescript
[KEYS.reports.title]: 'Reports',
[KEYS.settings.title]: 'Settings',
```

Use in JSX:
```tsx
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

<h1 className="ptitle">{t(KEYS.reports.title)}</h1>
```

---

## SweetAlert2 — Feedback

Use only the shared helpers:

```typescript
import { showSuccess, showError } from '@client/common/utils/swal';

// After successful settings update
await showSuccess('Setting updated', 'Your change has been saved.');

// On error
showError('Failed to save', err.response?.data?.errors?.[0]?.msg ?? t(KEYS.common.error));
```

---

## CSS and Styling

Use existing classes from `src/client/common/styles/portal.scss`:

- `.ptitle` — page heading
- `.psub` — page subtitle
- `.card` — white card container with border and rounded corners
- `.card-title` — card section heading
- `.label-text` — muted small text
- `.kpi` — KPI card (already used in DashboardPage, copy the pattern)
- `.chart-container` — pre-sized chart wrapper (height: 210px)
- `.seg` / `.segbtn` — segmented control for metric/groupBy switching (already in portal.scss)

---

## API Contract Alignment Tests — Mandatory

Before marking this ticket done, you must write alignment tests. The report endpoints already have tests in `src/test/reports.align.test.ts` and `src/test/dashboard.align.test.ts` — **do not duplicate them**. You must write:

### `src/test/settings.align.test.ts` (check if it already exists — extend it if so)

The test must verify:
1. `GET /api/settings` returns an array where every item has `id`, `name`, `label`, `value`, `group`, `editable`
2. `PUT /api/settings/:name` with `{ value: "..." }` returns the updated setting
3. Attempting to update a non-editable setting returns `400`
4. Missing `value` in the PUT body returns `422`

Add a `settingSchema` to `src/test/schemas.ts` if one does not already exist — check first.

Run with:
```bash
yarn test:align
```

All alignment tests must pass green before raising a PR.

---

## Definition of Done

### Reports Page

- [ ] Period selector with all 5 values; changing it re-fetches all data
- [ ] Summary KPIs show revenue, cost, profit, margin %, sales count, units sold
- [ ] Chart renders via Chart.js with metric switcher (revenue / profit / units)
- [ ] Top products table shows productName, options, unitsSold, revenue
- [ ] Profit breakdown renders with groupBy switcher (category / product / payment method)
- [ ] Stock health widget shows healthy / low stock / out of stock counts and inventory value
- [ ] `can_view_reports` permission gate respected
- [ ] All text uses `t(KEYS.reports.*)` — zero raw string literals
- [ ] `npx tsc --noEmit` produces zero errors

### Settings Page

- [ ] All settings rendered, grouped by `group`
- [ ] Settings with `editable: true` have an edit control
- [ ] Settings with `editable: false` displayed read-only with a clear visual distinction
- [ ] Successful update shows SweetAlert2 success and refreshes the displayed value
- [ ] `can_view_settings` and `can_update_settings` permission flags respected
- [ ] All text uses `t(KEYS.settings.*)` — zero raw string literals
- [ ] `npx tsc --noEmit` produces zero errors

### Both

- [ ] `src/test/settings.align.test.ts` written and passing
- [ ] `yarn test:align` passes green
- [ ] **No files under `src/server/` modified**
