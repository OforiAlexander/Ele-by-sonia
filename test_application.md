# Elegance by Sconia — Manual API Test Guide

> **Rule:** This document is updated after every feature is completed.  
> Base URL: `http://localhost:8000`  
> Session cookies are saved to `cookie.txt` in the current directory.

---

## Prerequisites

```bash
# Start the dev server
yarn dev:server

# Confirm the server is up
curl http://localhost:8000/api/auth/me
# Expected: 401 NOT_LOGGED_IN
```

---

## Feature 1 — Auth

### reCAPTCHA note
The dev environment uses Google's test reCAPTCHA keys. Any non-empty string passes as `recaptchaToken`.

---

### 1.1 Login

**Success (owner account)**
```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookie.txt \
  -d '{"email":"[OWNER_EMAIL]","password":"[OWNER_TEMP_PASSWORD]","recaptchaToken":"test"}' | jq
```
Expected: `200 { code: "LOGGED_IN", data: { email: "...", is_owner: true, ... } }`

**Wrong password**
```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"[OWNER_EMAIL]","password":"wrong","recaptchaToken":"test"}' | jq
```
Expected: `401 { code: "INVALID_CREDENTIALS" }`

**Missing email**
```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"TestPass123!","recaptchaToken":"test"}' | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

**Missing recaptchaToken**
```bash
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"[OWNER_EMAIL]","password":"[OWNER_TEMP_PASSWORD]"}' | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

---

### 1.2 Get current user (me)

```bash
curl -s http://localhost:8000/api/auth/me \
  -b cookie.txt | jq
```
Expected: `200 { data: { email: "...", can_view_products: true, ... } }`

**Without session**
```bash
curl -s http://localhost:8000/api/auth/me | jq
```
Expected: `401 { code: "NOT_LOGGED_IN" }`

---

### 1.3 Change password

```bash
curl -s -X POST http://localhost:8000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"currentPassword":"[OWNER_TEMP_PASSWORD]","newPassword":"NewSecurePass1!"}' | jq
```
Expected: `200 { code: "PASSWORD_CHANGED" }`

**Wrong current password**
```bash
curl -s -X POST http://localhost:8000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"currentPassword":"wrong","newPassword":"NewSecurePass1!"}' | jq
```
Expected: `401 { code: "INVALID_CREDENTIALS" }`

**New password too short**
```bash
curl -s -X POST http://localhost:8000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"currentPassword":"[OWNER_TEMP_PASSWORD]","newPassword":"short"}' | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

---

### 1.4 Forgot password (request OTP)

```bash
curl -s -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"identifier":"[OWNER_EMAIL]","recaptchaToken":"test"}' | jq
```
Expected: `200 { code: "RESET_CODE_SENT" }` — OTP sent to email and written to `messages` table.

**Check the OTP in the database**
```bash
psql -U alexander -h localhost -d elegance_sconia \
  -c "SELECT otp_code, otp_expires_at FROM users WHERE email='[OWNER_EMAIL]';"
```

**Unknown email (no enumeration)**
```bash
curl -s -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"identifier":"nobody@nowhere.com","recaptchaToken":"test"}' | jq
```
Expected: `200 { code: "RESET_CODE_SENT" }` (same response — intentional)

---

### 1.5 Verify OTP code

```bash
curl -s -X POST http://localhost:8000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"identifier":"[OWNER_EMAIL]","code":"[OTP_FROM_DB]"}' | jq
```
Expected: `200 { code: "CODE_VERIFIED", data: { resetToken: "..." } }`  
Copy the `resetToken` for the next step.

**Wrong code**
```bash
curl -s -X POST http://localhost:8000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"identifier":"[OWNER_EMAIL]","code":"000000"}' | jq
```
Expected: `400 { code: "CODE_INVALID" }`

---

### 1.6 Reset password

```bash
curl -s -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"[RESET_TOKEN]","newPassword":"ResetPass999!"}' | jq
```
Expected: `200 { code: "PASSWORD_UPDATED" }`

**Bad token**
```bash
curl -s -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token","newPassword":"ResetPass999!"}' | jq
```
Expected: `400 { code: "TOKEN_INVALID" }`

---

### 1.7 Logout

```bash
curl -s -X POST http://localhost:8000/api/auth/logout \
  -b cookie.txt \
  -c cookie.txt | jq
```
Expected: `200 { code: "LOGGED_OUT" }`

**Confirm session is gone**
```bash
curl -s http://localhost:8000/api/auth/me \
  -b cookie.txt | jq
```
Expected: `401 { code: "NOT_LOGGED_IN" }`

---

## Full reset flow (end-to-end)

```bash
# Step 1 — request OTP
curl -s -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"identifier":"[OWNER_EMAIL]","recaptchaToken":"test"}' | jq

# Step 2 — get the OTP from the DB
psql -U alexander -h localhost -d elegance_sconia \
  -c "SELECT otp_code FROM users WHERE email='[OWNER_EMAIL]';"

# Step 3 — verify OTP (replace OTP with value from DB)
curl -s -X POST http://localhost:8000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"identifier":"[OWNER_EMAIL]","code":"[OTP]"}' | jq
# Copy the resetToken from the response

# Step 4 — set new password (replace TOKEN with value from step 3)
curl -s -X POST http://localhost:8000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"[TOKEN]","newPassword":"BrandNew999!"}' | jq

# Step 5 — log in with new password
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookie.txt \
  -d '{"email":"[OWNER_EMAIL]","password":"BrandNew999!","recaptchaToken":"test"}' | jq
```

---

---

## Feature 2 — Permissions

### 2.1 List permissions (grouped by resource)

```bash
# Must be logged in first (see 1.1)
curl -s http://localhost:8000/api/permissions \
  -b cookie.txt | jq
```
Expected: `200 { data: { products: [...], sales: [...], staff: [...], ... } }`  
Each entry has `id`, `name`, `label`, `resource`, `is_sensitive`.  
Total permissions across all groups: **30**.

**Without session**
```bash
curl -s http://localhost:8000/api/permissions | jq
```
Expected: `401 { code: "NOT_LOGGED_IN" }`

---

## Feature 3 — Roles

> Must be logged in as the owner account. See §1.1.

### 3.1 List roles

```bash
```
Expected: `200 { data: [...] }`

**Without permission**
```bash
# (Log in as a staff member without can_view_roles first)
curl -s http://localhost:8000/api/roles -b cookie.txt | jq
```
Expected: `403 { code: "FORBIDDEN" }`

---

### 3.2 Create role

```bash
PERM_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM permissions WHERE name='products.view' LIMIT 1;" | tr -d ' ')

curl -s -X POST http://localhost:8000/api/roles \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"name\":\"Store Clerk\",\"description\":\"Can view products\",\"permissionIds\":[\"$PERM_ID\"]}" | jq
```
Expected: `201 { code: "ROLE_CREATED", data: { id: "...", name: "Store Clerk", permissions: [...] } }`

**Duplicate name**
```bash
curl -s -X POST http://localhost:8000/api/roles \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Store Clerk","permissionIds":[]}' | jq
```
Expected: `409 { code: "DUPLICATE" }`

**Missing name**
```bash
curl -s -X POST http://localhost:8000/api/roles \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"permissionIds":[]}' | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

---

### 3.3 Get role

```bash
ROLE_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM roles WHERE name='Store Clerk' LIMIT 1;" | tr -d ' ')

curl -s "http://localhost:8000/api/roles/$ROLE_ID" -b cookie.txt | jq
```
Expected: `200 { data: { id: "...", name: "Store Clerk", permissions: [...] } }`

---

### 3.4 Update role

```bash
curl -s -X PUT "http://localhost:8000/api/roles/$ROLE_ID" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Store Clerk Updated","permissionIds":[]}' | jq
```
Expected: `200 { code: "ROLE_UPDATED", data: { name: "Store Clerk Updated", permissions: [] } }`

---

### 3.5 Delete role

```bash
curl -s -X DELETE "http://localhost:8000/api/roles/$ROLE_ID" \
  -b cookie.txt | jq
```
Expected: `200 { code: "ROLE_DELETED" }`

**Role in use (assign staff first)**
```bash
# Assign staff to role, then try to delete
curl -s -X DELETE "http://localhost:8000/api/roles/$ROLE_ID" \
  -b cookie.txt | jq
```
Expected: `400 { code: "ROLE_IN_USE" }`

---

## Feature 4 — Staff

> Must be logged in as owner or user with appropriate staff permissions.

### 4.1 List staff

```bash
curl -s http://localhost:8000/api/staff -b cookie.txt | jq
```
Expected: `200 { data: [{ id, name, email, phone, is_active, role: { id, name } }, ...] }` — owners excluded.

---

### 4.2 Create staff member

```bash
# Get a role ID first
ROLE_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM roles LIMIT 1;" | tr -d ' ')

curl -s -X POST http://localhost:8000/api/staff \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"name\":\"Jane Doe\",\"email\":\"jane@example.com\",\"phone\":\"0241234567\",\"role_id\":\"$ROLE_ID\"}" | jq
```
Expected: `201 { code: "STAFF_CREATED", data: { id, name, email, is_active: true, must_change_password: true } }`
A welcome email with a temp password is sent.

**Duplicate email**
```bash
curl -s -X POST http://localhost:8000/api/staff \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Dupe","email":"jane@example.com"}' | jq
```
Expected: `409 { code: "CONFLICT" }`

---

### 4.3 Get staff member

```bash
STAFF_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM users WHERE email='jane@example.com';" | tr -d ' ')

curl -s "http://localhost:8000/api/staff/$STAFF_ID" -b cookie.txt | jq
```
Expected: `200 { data: { id, name, email, role: { id, name } } }`

---

### 4.4 Update staff member

```bash
curl -s -X PUT "http://localhost:8000/api/staff/$STAFF_ID" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Jane Updated","phone":"0550000000"}' | jq
```
Expected: `200 { code: "STAFF_UPDATED", data: { name: "Jane Updated" } }`

---

### 4.5 Deactivate / reactivate staff member

```bash
# First call deactivates
curl -s -X PATCH "http://localhost:8000/api/staff/$STAFF_ID/deactivate" \
  -b cookie.txt | jq
```
Expected: `200 { data: { is_active: false } }`

```bash
# Second call reactivates (toggle)
curl -s -X PATCH "http://localhost:8000/api/staff/$STAFF_ID/deactivate" \
  -b cookie.txt | jq
```
Expected: `200 { data: { is_active: true } }`

**Cannot deactivate the owner**
```bash
OWNER_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM users WHERE is_owner=true LIMIT 1;" | tr -d ' ')

curl -s -X PATCH "http://localhost:8000/api/staff/$OWNER_ID/deactivate" \
  -b cookie.txt | jq
```
Expected: `400`

---

## Automated test suite

```bash
# Run all tests
yarn test

# Watch mode
yarn test:watch
```

---

## Feature 5 — Products

> Must be logged in with appropriate product permissions (owner has all).

### 5.1 List products

```bash
curl -s http://localhost:8000/api/products -b cookie.txt | jq
```
Expected: `200 { data: [{ id, name, category, brand, is_active, variants: [...], images: [...] }] }`

---

### 5.2 Create product

```bash
curl -s -X POST http://localhost:8000/api/products \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Classic Tee","category":"tops","brand":"Elegance","description":"A classic fit tee"}' | jq
```
Expected: `201 { code: "PRODUCT_CREATED", data: { id, name, is_active: true } }`

**Missing category**
```bash
curl -s -X POST http://localhost:8000/api/products \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Classic Tee"}' | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

---

### 5.3 Get product

```bash
PROD_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM products WHERE name='Classic Tee' LIMIT 1;" | tr -d ' ')

curl -s "http://localhost:8000/api/products/$PROD_ID" -b cookie.txt | jq
```
Expected: `200 { data: { id, name, variants: [], images: [] } }`

---

### 5.4 Update product

```bash
curl -s -X PUT "http://localhost:8000/api/products/$PROD_ID" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"name":"Classic Tee Updated","category":"tops","brand":"Sconia"}' | jq
```
Expected: `200 { code: "PRODUCT_UPDATED", data: { name: "Classic Tee Updated" } }`

---

### 5.5 Deactivate product

```bash
curl -s -X DELETE "http://localhost:8000/api/products/$PROD_ID" \
  -b cookie.txt | jq
```
Expected: `200 { code: "PRODUCT_DELETED", data: { is_active: false } }`

---

## Feature 6 — Variants

> Must be logged in with appropriate variant permissions (owner has all). Variants belong to a product.

### 6.1 List variants for a product

```bash
PROD_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM products LIMIT 1;" | tr -d ' ')

curl -s "http://localhost:8000/api/variants?productId=$PROD_ID" \
  -b cookie.txt | jq
```
Expected: `200 { data: [{ id, product_id, size, colour, style, cost_price, selling_price, stock, sku, is_active }] }`

**Missing productId**
```bash
curl -s "http://localhost:8000/api/variants" -b cookie.txt | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

---

### 6.2 Create variant

```bash
curl -s -X POST http://localhost:8000/api/variants \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"product_id\":\"$PROD_ID\",\"size\":\"M\",\"colour\":\"Black\",\"cost_price\":25.00,\"selling_price\":50.00,\"low_stock_threshold\":3,\"sku\":\"SKU-001\"}" | jq
```
Expected: `201 { code: "VARIANT_CREATED", data: { id, stock: 0, is_active: true } }`

**Duplicate SKU**
```bash
curl -s -X POST http://localhost:8000/api/variants \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"product_id\":\"$PROD_ID\",\"cost_price\":10,\"selling_price\":20,\"sku\":\"SKU-001\"}" | jq
```
Expected: `409 { code: "CONFLICT" }`

**Missing cost_price**
```bash
curl -s -X POST http://localhost:8000/api/variants \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"product_id\":\"$PROD_ID\",\"selling_price\":20}" | jq
```
Expected: `422 { code: "VALIDATION_ERROR" }`

---

### 6.3 Get variant

```bash
VAR_ID=$(psql -U alexander -h localhost -d elegance_sconia \
  -t -c "SELECT id FROM product_variants LIMIT 1;" | tr -d ' ')

curl -s "http://localhost:8000/api/variants/$VAR_ID" -b cookie.txt | jq
```
Expected: `200 { data: { id, product_id, size, colour, ... } }`

---

### 6.4 Update variant

```bash
curl -s -X PUT "http://localhost:8000/api/variants/$VAR_ID" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"size":"L","colour":"White","cost_price":30.00,"selling_price":65.00}' | jq
```
Expected: `200 { code: "VARIANT_UPDATED", data: { size: "L", colour: "White" } }`

**Deactivate variant via PUT**
```bash
curl -s -X PUT "http://localhost:8000/api/variants/$VAR_ID" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"cost_price":30,"selling_price":65,"is_active":false}' | jq
```
Expected: `200 { data: { is_active: false } }`

---

### 6.5 Delete variant (permanent)

```bash
curl -s -X DELETE "http://localhost:8000/api/variants/$VAR_ID" \
  -b cookie.txt | jq
```
Expected: `200 { code: "VARIANT_DELETED" }`

---

## Feature 8 — Sales / POS

### Setup

```bash
# Log in as owner first (saves session to cookie.txt)
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookie.txt \
  -d '{"email":"[OWNER_EMAIL]","password":"[OWNER_PASSWORD]","recaptchaToken":"test"}' | jq

# Look up a variant ID to use in sale tests
curl -s http://localhost:8000/api/products -b cookie.txt | jq '.data.products[0].variants[0].id'
VARIANT_ID="<paste uuid here>"
```

### 8.1 Process a cash sale

```bash
curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"items\":[{\"variant_id\":\"$VARIANT_ID\",\"quantity\":2}],\"payment_method\":\"cash\",\"amount_tendered\":300}" | jq
```
Expected: `201 { code: "SALE_COMPLETED", data: { sale_number: "SL-YYYYMMDD-0001", payment_status: "paid", ... } }`

```bash
SALE_ID=$(curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"items\":[{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}],\"payment_method\":\"cash\",\"amount_tendered\":200}" \
  | jq -r '.data.id')
echo "SALE_ID=$SALE_ID"
```

### 8.2 Process a momo sale with discount

```bash
curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"items\":[{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}],\"payment_method\":\"momo\",\"discount\":10,\"note\":\"Loyalty discount\"}" | jq
```
Expected: `201` — `amount_due` = selling_price minus 10, `payment_status: "paid"`, `amount_tendered: null`, `change_given: null`

### 8.3 Validation errors

```bash
# No items
curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"items":[],"payment_method":"cash","amount_tendered":100}' | jq
# Expected: 422

# Duplicate variant IDs
curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"items\":[{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1},{\"variant_id\":\"$VARIANT_ID\",\"quantity\":2}],\"payment_method\":\"cash\",\"amount_tendered\":500}" | jq
# Expected: 422 VALIDATION_ERROR

# Cash with no amount_tendered
curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"items\":[{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}],\"payment_method\":\"cash\"}" | jq
# Expected: 422

# Amount tendered too low
curl -s -X POST http://localhost:8000/api/sales \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d "{\"items\":[{\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}],\"payment_method\":\"cash\",\"amount_tendered\":1}" | jq
# Expected: 400 AMOUNT_INSUFFICIENT
```

### 8.4 List sales

```bash
curl -s "http://localhost:8000/api/sales" -b cookie.txt | jq
# Expected: 200 { data: { sales: [...], total: N, page: 1, limit: 20 } }

curl -s "http://localhost:8000/api/sales?page=1&limit=5&payment_method=cash" -b cookie.txt | jq
# Expected: 200, sales.length <= 5
```

### 8.5 Get single sale

```bash
curl -s "http://localhost:8000/api/sales/$SALE_ID" -b cookie.txt | jq
# Expected: 200, data includes items array and staff object
```

### 8.6 Void a sale

```bash
curl -s -X POST "http://localhost:8000/api/sales/$SALE_ID/void" \
  -b cookie.txt | jq
# Expected: 200 { code: "SALE_VOIDED", data: { voided_at: "...", voided_by_id: "..." } }

# Void again — should fail
curl -s -X POST "http://localhost:8000/api/sales/$SALE_ID/void" \
  -b cookie.txt | jq
# Expected: 400 { code: "ALREADY_VOIDED" }
```

---

---

## Feature 9: Reports

All report endpoints require login and `can_view_reports` permission.

### 9.0 Login (reuse from earlier)

```bash
curl -s -c cookie.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"YourPassword","recaptchaToken":"skip"}' | jq
```

### 9.1 Summary

```bash
# Monthly summary for current month
curl -s "http://localhost:8000/api/reports/summary?period=monthly" -b cookie.txt | jq
# Expected: 200 { data: { period, from, to, revenue, cost, profit, marginPercent, salesCount, unitsSold } }

# Daily summary for a specific date
curl -s "http://localhost:8000/api/reports/summary?period=daily&date=2024-12-01" -b cookie.txt | jq

# Annual summary
curl -s "http://localhost:8000/api/reports/summary?period=annual" -b cookie.txt | jq

# Missing period — validation error
curl -s "http://localhost:8000/api/reports/summary" -b cookie.txt | jq
# Expected: 422
```

### 9.2 Profit breakdown

```bash
# By category (default)
curl -s "http://localhost:8000/api/reports/profit?period=monthly" -b cookie.txt | jq
# Expected: 200 { data: [{ group, revenue, cost, profit, margin }, ...] }

# By product
curl -s "http://localhost:8000/api/reports/profit?period=monthly&groupBy=product" -b cookie.txt | jq

# By payment method
curl -s "http://localhost:8000/api/reports/profit?period=weekly&groupBy=payment_method" -b cookie.txt | jq

# Invalid groupBy
curl -s "http://localhost:8000/api/reports/profit?period=monthly&groupBy=unknown" -b cookie.txt | jq
# Expected: 422
```

### 9.3 Top products

```bash
# Default top 10 for current month
curl -s "http://localhost:8000/api/reports/top-products?period=monthly" -b cookie.txt | jq
# Expected: 200 { data: [{ variantId, productName, sku, options, unitsSold, revenue }, ...] }

# Top 5 for a quarterly period
curl -s "http://localhost:8000/api/reports/top-products?period=quarterly&limit=5" -b cookie.txt | jq

# Limit out of range
curl -s "http://localhost:8000/api/reports/top-products?period=monthly&limit=100" -b cookie.txt | jq
# Expected: 422
```

### 9.4 Chart data

```bash
# Revenue chart for current month (daily buckets)
curl -s "http://localhost:8000/api/reports/chart?period=monthly&metric=revenue" -b cookie.txt | jq
# Expected: 200 { data: { labels: ["1","2",...,"31"], values: [0,0,...] } }

# Profit chart for annual period (monthly buckets)
curl -s "http://localhost:8000/api/reports/chart?period=annual&metric=profit" -b cookie.txt | jq
# Expected: { data: { labels: ["Jan","Feb",...,"Dec"], values: [...] } }

# Units sold chart for a specific week
curl -s "http://localhost:8000/api/reports/chart?period=weekly&metric=units&date=2024-12-02" -b cookie.txt | jq
# Expected: { data: { labels: ["Mon","Tue",...,"Sun"], values: [...] } }

# Daily chart (hourly buckets)
curl -s "http://localhost:8000/api/reports/chart?period=daily" -b cookie.txt | jq
# Expected: { data: { labels: ["0","1",...,"23"], values: [...] } }

# Invalid metric
curl -s "http://localhost:8000/api/reports/chart?period=monthly&metric=invalid" -b cookie.txt | jq
# Expected: 422

# Unauthenticated
curl -s "http://localhost:8000/api/reports/summary?period=monthly" | jq
# Expected: 401
```

---

## Feature 10: Settings

All settings endpoints require login. View requires `can_view_settings`; update requires `can_update_settings` (owner-only by default, or any role with that permission).

### 10.0 Login (reuse from earlier)

```bash
curl -s -c cookie.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"YourPassword","recaptchaToken":"skip"}' | jq
```

### 10.1 List all settings

```bash
curl -s "http://localhost:8000/api/settings" -b cookie.txt | jq
# Expected: 200 { data: [ { id, name, label, value, group, editable }, ... ] }
```

Settings returned — editable and non-editable — grouped by: `general`, `inventory`, `payments`, `ecommerce`.

### 10.2 Update a setting

```bash
# Update business name (editable)
curl -s -X PUT "http://localhost:8000/api/settings/BUSINESS_NAME" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"value":"Elegance by Sconia"}' | jq
# Expected: 200 { code: "SETTINGS_UPDATED", data: { name: "BUSINESS_NAME", value: "Elegance by Sconia", ... } }

# Update low-stock threshold
curl -s -X PUT "http://localhost:8000/api/settings/LOW_STOCK_DEFAULT_THRESHOLD" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"value":"10"}' | jq
# Expected: 200 SETTINGS_UPDATED

# Toggle low-stock alert
curl -s -X PUT "http://localhost:8000/api/settings/LOW_STOCK_ALERT_ENABLED" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"value":"false"}' | jq
# Expected: 200 SETTINGS_UPDATED
```

### 10.3 Error cases

```bash
# Non-editable setting
curl -s -X PUT "http://localhost:8000/api/settings/SALE_NUMBER_PREFIX" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"value":"INV-"}' | jq
# Expected: 400

# Unknown setting name
curl -s -X PUT "http://localhost:8000/api/settings/NONEXISTENT" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{"value":"x"}' | jq
# Expected: 404

# Missing value
curl -s -X PUT "http://localhost:8000/api/settings/BUSINESS_NAME" \
  -H "Content-Type: application/json" \
  -b cookie.txt \
  -d '{}' | jq
# Expected: 422

# Unauthenticated
curl -s "http://localhost:8000/api/settings" | jq
# Expected: 401
```

---

## Feature 11: CSV Product Import

Requires login and `can_create_products` permission.

### 11.0 Login (reuse from earlier)

```bash
curl -s -c cookie.txt -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"YourPassword","recaptchaToken":"skip"}' | jq
```

### 11.1 Import a CSV file

```bash
curl -s -X POST http://localhost:8000/api/products/import \
  -b cookie.txt \
  -F "file=@/path/to/products.csv" | jq
# Expected: 200 { code: "IMPORT_COMPLETE", data: { productsCreated, variantsCreated, skipped, errors: [] } }
```

CSV must have these headers (in any order):
```
product_name,category,brand,description,size,colour,style,cost_price,selling_price,stock,low_stock_threshold,sku
```

Required columns: `product_name`, `category`, `size`, `colour`, `cost_price`, `selling_price`, `stock`.
Optional: `brand`, `description`, `style`, `low_stock_threshold` (defaults to 5), `sku`.

Products with the same `product_name` + `category` are merged — the import adds the variant to the existing product rather than creating a duplicate.

### 11.2 Sample CSV

```
product_name,category,brand,description,size,colour,style,cost_price,selling_price,stock,low_stock_threshold,sku
Ankara Wrap Dress,Ladies Clothing,Elegance by Sconia,Beautifully crafted,M,Red,Regular,60,120,5,3,EBS-ANK-M-RED
Ankara Wrap Dress,Ladies Clothing,Elegance by Sconia,,L,Blue,,70,130,3,2,EBS-ANK-L-BLUE
White Linen Shirt,Mens Clothing,,,S,White,,50,100,10,,
```

### 11.3 Error cases

```bash
# No file attached
curl -s -X POST http://localhost:8000/api/products/import -b cookie.txt | jq
# Expected: 422

# Unauthenticated
curl -s -X POST http://localhost:8000/api/products/import \
  -F "file=@/path/to/products.csv" | jq
# Expected: 401
```

Rows with missing required fields or invalid numbers are skipped and listed in `errors[]` with the row number and reason. Valid rows in the same file still process normally.

---

## Feature 12: Product Image Uploads

Requires login and `can_update_products` permission.

### 12.1 Upload images to a product

```bash
# Upload one image
curl -s -X POST "http://localhost:8000/api/products/$PRODUCT_ID/images" \
  -b cookie.txt \
  -F "images=@/path/to/photo.jpg" | jq
# Expected: 201 { data: [{ id, image_path, sort_order }, ...] }

# Upload multiple images at once (up to 8)
curl -s -X POST "http://localhost:8000/api/products/$PRODUCT_ID/images" \
  -b cookie.txt \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" | jq
# Expected: 201, sort_order assigned in upload order
```

Accepted types: `image/jpeg`, `image/png`. Max 8 files per request. Max 5 MB per file (set by `MAX_IMAGE_SIZE` env var).

In development: files saved to `uploads/products/`.  
In production: files uploaded directly to S3 (`AWS_S3_BUCKET`).

### 12.2 Delete an image

```bash
curl -s -X DELETE "http://localhost:8000/api/products/$PRODUCT_ID/images/$IMAGE_ID" \
  -b cookie.txt | jq
# Expected: 200 { code: "OK" }
# File is also removed from disk (dev) or S3 (prod)
```

### 12.3 Error cases

```bash
# Wrong file type
curl -s -X POST "http://localhost:8000/api/products/$PRODUCT_ID/images" \
  -b cookie.txt \
  -F "images=@document.pdf" | jq
# Expected: 400

# No file attached
curl -s -X POST "http://localhost:8000/api/products/$PRODUCT_ID/images" \
  -b cookie.txt | jq
# Expected: 422

# Unknown product
curl -s -X POST "http://localhost:8000/api/products/00000000-0000-0000-0000-000000000000/images" \
  -b cookie.txt \
  -F "images=@photo.jpg" | jq
# Expected: 404

# Unknown image ID on delete
curl -s -X DELETE "http://localhost:8000/api/products/$PRODUCT_ID/images/00000000-0000-0000-0000-000000000000" \
  -b cookie.txt | jq
# Expected: 404
```

---

## Automated test suite

```bash
# Backend unit + integration tests
yarn test

# Frontend-backend alignment tests (verifies API shapes match frontend TypeScript types)
yarn test:align
```

Backend coverage: Auth — 26, Permissions — 5, Roles — 18, Staff — 26, Products — 22, Product Import — 8, Product Images — 11, Variants — 28, Stock — 34, Sales — 35, Reports — 36, Settings — 12. **301 total, all passing.**

Alignment test coverage: Auth — 11, Products — 10, Variants — 10, Settings — 9, Sales — 14. **54 total, all passing.**

### Key alignment findings (documented by tests)

- Pagination is inside `data` — e.g. `res.body.data.products`, not `res.body.data[]` with a `meta` sibling
- Cash sales require `amount_tendered` in the request body
- `role_id` and `sku` are absent (not `null`) in JSON when the model field is null — Objection.js optional field pattern
- Variants route is `POST /api/variants` with `{product_id, optionValueIds: [], ...}` — not `/api/products/:id/variants`
- Sale total is `amount_due` — not `total_amount`
