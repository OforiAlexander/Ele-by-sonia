# Elegance by Sconia

Inventory, POS, and e-commerce system for a fashion retail store in Ghana. Built in two phases:

- **Phase 1** — Brick-and-mortar: product catalogue, stock management, in-store POS, staff management, sales reports.
- **Phase 2** — Online storefront with Paystack payments and order/delivery tracking.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20+, TypeScript |
| Framework | Express.js |
| Database | PostgreSQL (Objection.js + Knex) |
| Sessions | express-session + Redis |
| Frontend | React, Mantine UI, Formik/Yup, Webpack |
| Email | Nodemailer (Gmail SMTP) |
| File storage | AWS S3 + multer-s3 |
| Payments | Paystack |
| Package manager | Yarn |

---

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Yarn

---

## Setup

**1. Install dependencies**
```bash
yarn install
```

**2. Configure environment**

Copy `nodemon.jsonc` to `nodemon.json` and fill in the blank values
Command: cp nodemon.jsonc nodemon.json

```jsonc
{
  "env": {
    "DATABASE_URL": "use your relative db (psql)",
    "SESSION_SECRET": "a-long-random-string",
    "REDIS_URL": "redis://127.0.0.1:6379/0", // needed for cache and in-memory store
    "RECAPTCHA_SITE_KEY": "",
    "RECAPTCHA_SECRET_KEY": "",
    "MAIL_USER": "you@gmail.com",
    "MAIL_PASSWORD": "app-password",
    "AWS_S3_BUCKET": "",
    "AWS_ACCESS_KEY_ID": "",
    "AWS_SECRET_ACCESS_KEY": "",
    "PAYSTACK_PUBLIC_KEY": "",
    "PAYSTACK_SECRET_KEY": "",
    //frist seeded account (the owner)
    "OWNER_EMAIL": "owner@example.com",
    "OWNER_TEMP_PASSWORD": "ChangeMe123!"
  }
}
```

> `nodemon.json` is gitignored. Never commit it — it holds live secrets.

**3. Run database migrations**
```bash
yarn migrate
```

**4. Start development**
```bash
yarn dev      
```

The server starts at `http://localhost:8000`.  
On first startup it auto-seeds: permissions, settings, default roles, and the owner account.

**5. Build for production**
```bash
yarn build       # compiles all 3 frontend bundles into public/
```

---

## Scripts

| Script | What it does |
|--------|-------------|
| `yarn dev` | Start server + webpack watchers |
| `yarn dev:server` | Server only (nodemon) |
| `yarn dev:client` | Webpack watchers only |
| `yarn build` | Production webpack build |
| `yarn migrate` | Run pending DB migrations |
| `yarn migrate:rollback` | Roll back last migration batch |
| `yarn migrate:make <name>` | Create a new migration file |
| `yarn test` | Run all 355 tests |
| `yarn test:unit` | Backend integration tests only |
| `yarn test:align` | Frontend-backend alignment tests only |

---

## Portals

| URL | Purpose |
|-----|---------|
| `/account/` | Login, password reset — shared entry point |
| `/inventory/` | Staff portal: products, POS, reports, settings |
| `/store/` | Phase 2 customer storefront |

---

## API Reference

All endpoints are under `/api`. Session cookie authentication unless noted.

### Auth — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Email + password login. Requires reCAPTCHA token. |
| POST | `/logout` | Destroys session. |
| GET | `/me` | Returns the logged-in user with all `can_*` permission flags. |
| POST | `/forgot-password` | Sends a 6-digit OTP to the user's email. |
| POST | `/verify-code` | Validates OTP, returns a short-lived reset token. |
| POST | `/set-password` | Sets new password using reset token. |

### Products — `/api/products`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Paginated product list. Query: `page`, `limit`, `search`, `category`. |
| POST | `/` | Create product. Body: `name`, `category`, optional `brand`, `description`. |
| GET | `/:id` | Single product with its variants. |
| PUT | `/:id` | Update product fields. |
| DELETE | `/:id` | Delete product (cascades variants). |
| POST | `/import` | Bulk import from CSV file. |
| POST | `/:id/images` | Upload images to S3 (multipart). |
| DELETE | `/:id/images/:imageId` | Remove a product image. |

### Variants — `/api/variants`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List variants for a product. Query: `productId` (required). |
| POST | `/` | Create variant. Body: `product_id`, `cost_price`, `selling_price`, `optionValueIds[]`. |
| PUT | `/:id` | Update variant pricing or threshold. |
| DELETE | `/:id` | Deactivate variant. |

### Stock — `/api/stock`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/receive` | Add stock to a variant (`variant_id`, `quantity`). Writes audit log. |
| POST | `/adjust` | Manual stock adjustment with reason. |

### Sales / POS — `/api/sales`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Process a sale. Body: `payment_method` (cash\|momo), `amount_tendered` (required for cash), `items: [{variant_id, quantity}]`, optional `discount`. Decrements stock. |
| GET | `/` | Paginated sales history. Query: `page`, `limit`, `from`, `to`, `payment_method`. |
| GET | `/:id` | Single sale with line items. |
| POST | `/:id/void` | Void a sale and restore stock. Requires `can_void_sales`. |

### Reports — `/api/reports`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/summary` | Total revenue, profit, units sold. Query: `from`, `to`. |
| GET | `/sales-by-day` | Daily revenue breakdown. |
| GET | `/top-products` | Best-selling variants by quantity. |
| GET | `/low-stock` | Variants at or below `low_stock_threshold`. |

### Staff — `/api/staff`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all staff. |
| POST | `/` | Create staff account. Sends welcome email with temp password. |
| PUT | `/:id` | Update name, email, phone, role. |
| POST | `/:id/deactivate` | Disable login. |
| POST | `/:id/reactivate` | Re-enable login. |

### Roles & Permissions — `/api/roles`, `/api/permissions`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/permissions` | List all available permissions. |
| GET | `/roles` | List roles with their permissions. |
| POST | `/roles` | Create a role. |
| PUT | `/roles/:id` | Update name or assigned permissions. |
| DELETE | `/roles/:id` | Delete role if no staff assigned. |

### Settings — `/api/settings`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | All settings (business name, currency, etc). |
| PUT | `/:name` | Update a setting value. Body: `{ value }`. |

---

## Backend Architecture

```
src/server/
├── app.ts              # Entry point — connects DB, starts server
├── createApp.ts        # Express app factory (used in tests too)
├── constants/          # Permission names, setting keys (seeded from here)
├── migrations/         # Knex migration files (YYYYMMDDHHMMSS_*.ts)
├── models/             # Objection.js models (User, Product, Sale, …)
├── routes/api/         # One folder per resource (controller + service + index)
├── middleware/         # isLoggedIn, hasPermission, validate, sanitise, errorHandler
├── services/           # mail/, redis/, upload/, payment/, audit/, recaptcha/
├── startup/            # ensurePermissions, ensureSettings, ensureOwnerAccount, ensureDefaultRoles
└── jobs/               # node-schedule background jobs (low-stock alerts)
```

**Startup sequence** (runs on every boot):
1. Connect PostgreSQL → run pending migrations
2. Sync permissions from constants (add new, never delete)
3. Sync settings from constants (add new keys, preserve existing values)
4. Ensure default roles exist
5. Ensure owner account exists
6. Register background jobs
7. HTTP server starts

---

## Permissions

Format: `resource.action` — e.g. `products.create`, `sales.void`.  
`is_owner = true` bypasses all permission checks.  
The `User` model computes `can_*` boolean flags via `$afterGet()` for easy frontend checks.

---

## Testing

Tests live in `src/test/`. Two categories:

- **Integration tests** (`*.test.ts`) — hit a real database via supertest. 301 tests.
- **Alignment tests** (`*.align.test.ts`) — verify API response shapes match frontend TypeScript types and Yup schemas. 54 tests.

```bash
yarn test           # all 355 tests
yarn test:unit      # integration only
yarn test:align     # alignment only
```

Tests use the same database as development. Each suite cleans up its own data.

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection (default: `redis://127.0.0.1:6379/0`) |
| `SESSION_SECRET` | Yes | Long random string for signing session cookies |
| `PORT` | No | HTTP port (default: `8000`) |
| `NODE_ENV` | No | `development` or `production` |
| `BASE_URL` | No | Public base URL (used in email links) |
| `RECAPTCHA_SITE_KEY` | No | Google reCAPTCHA v2 site key (omit to disable) |
| `RECAPTCHA_SECRET_KEY` | No | Google reCAPTCHA v2 secret |
| `MAIL_USER` | Yes | Gmail address for sending email |
| `MAIL_PASSWORD` | Yes | Gmail app password |
| `MAIL_FROM` | No | From display name and address |
| `AWS_S3_BUCKET` | Yes | S3 bucket for product images |
| `AWS_REGION` | Yes | S3 region |
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `MAX_IMAGE_SIZE` | No | Max upload size in MB (default: `5`) |
| `PAYSTACK_PUBLIC_KEY` | Phase 2 | Paystack public key |
| `PAYSTACK_SECRET_KEY` | Phase 2 | Paystack secret key |
| `OWNER_EMAIL` | First boot | Owner account email |
| `OWNER_TEMP_PASSWORD` | First boot | Owner temporary password |
| `ALLOW_REGISTRATION` | No | Set `true` to open public signup (default: `false`) |
