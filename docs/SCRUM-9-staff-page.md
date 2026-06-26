# SCRUM-9 — Design Staff Assignment Page

**Jira:** SCRUM-9  
**Assignee:** OA  
**Branch:** `SCRUM-9-design-staff-assignment-page`  
**First commit:** `git commit -m "SCRUM-9 design staff assignment page"`

---

## Git Setup

```bash
git checkout main
git pull origin main
git checkout -b SCRUM-9-design-staff-assignment-page
# Do your first commit with exactly this message:
git commit -m "SCRUM-9 design staff assignment page"
```

All subsequent commits on this branch must follow conventional commit format:

```
feat: add staff table with pagination
fix: role dropdown not clearing on modal close
```

**Do not push to main. Do not open a PR without review.**

---

## Scope

You are building **one page**: `src/client/portals/inventory/pages/StaffPage.tsx`.

You may also need to create sub-components inside a new directory:
`src/client/portals/inventory/components/staff/`

You are not building anything else. Do not touch routes, pages, or components outside this scope.

---

## CRITICAL — Backend Is Off Limits

> **You must not modify any file under `src/server/`.  
> You must not modify any database migration file.  
> You must not add, rename, or remove any API endpoint.  
> You must not modify any backend model, service, controller, or middleware.**

The backend for this feature is complete and tested. Your job is to build a UI that correctly consumes the existing endpoints. If you believe the backend has a bug, raise it in Slack — do not attempt to fix it yourself.

---

## What You Are Building

A staff management page accessible to the owner and staff with the right permissions. It has three functions:

1. **List all staff members** — paginated table showing name, email, phone, role, and active status
2. **Create a new staff member** — modal form; the backend auto-generates a temporary password and emails it to the new staff member
3. **Edit an existing staff member** — same modal, pre-filled; name, phone, and role can be changed (email cannot)
4. **Deactivate / reactivate a staff member** — toggle action with a confirmation dialog

---

## API Endpoints — Read Carefully, Use Exactly As Documented

### List staff

```
GET /api/staff
Query params:
  page  (optional, integer ≥ 1, default 1)
  limit (optional, integer 1–100, default 50)

Response shape:
{
  code: "OK",
  data: {
    staff: StaffMember[],
    total: number,
    page: number,
    limit: number
  }
}
```

Each `StaffMember` object:
```typescript
{
  id: string           // UUID
  name: string
  email: string
  phone: string        // may be empty string ""
  is_active: boolean
  is_owner: boolean    // always false — the owner is never in this list
  must_change_password: boolean
  role_id: string | null
  role: { id: string; name: string } | null
}
```

**Sensitive fields are already stripped by the backend.** You will never receive `password_hash`, `otp_code`, or `reset_token`. Do not attempt to read them.

---

### Get single staff member

```
GET /api/staff/:id

Response shape:
{
  code: "OK",
  data: StaffMember   // same shape as above
}
```

---

### Create staff member

```
POST /api/staff
Content-Type: application/json

Body:
{
  name: string         // required, non-empty
  email: string        // required, valid email
  phone?: string       // optional
  role_id?: string     // optional, UUID — null removes the role
}

Success response:
{
  code: "CREATED",
  data: StaffMember
}

Error responses:
  409 CONFLICT — email already exists
  422 VALIDATION_ERROR — missing/invalid fields
```

**The backend automatically:**
- Sets `must_change_password: true`
- Generates a random temporary password
- Sends a welcome email with the temporary password to the new staff member's email

**You do not need to show the password to the user.** Just show a success message confirming the account was created and the email was sent.

---

### Update staff member

```
PUT /api/staff/:id
Content-Type: application/json

Body:
{
  name: string          // required
  phone?: string        // optional
  role_id?: string | null  // optional UUID; pass null to remove role
}

Note: email cannot be changed. Do not include email in the PUT body.

Success response:
{
  code: "OK",
  data: StaffMember
}
```

---

### Deactivate / reactivate staff member

```
PATCH /api/staff/:id/deactivate

No request body required.

This is a TOGGLE — if the staff member is active, this deactivates them.
If they are inactive, this reactivates them.

Success response:
{
  code: "OK",
  data: StaffMember   // with updated is_active value
}

Error:
  400 FORBIDDEN — cannot change the owner's status
```

---

### Roles (for the role dropdown)

You need to populate the role selector in the create/edit form. Fetch roles from:

```
GET /api/roles

Response:
{
  code: "OK",
  data: Role[]
}

Role shape:
{
  id: string
  name: string
  created_at: string
}
```

---

## Permission Gates

The backend enforces permissions server-side. Your UI must also respect them client-side so that buttons are not shown to users who cannot perform the action.

Read the `user` object from `useAuth()`. Check the relevant `can_*` flag before rendering each action:

| Action | Flag to check |
|---|---|
| See the page at all | `can_view_staff` |
| Create button | `can_create_staff` |
| Edit button | `can_update_staff` |
| Deactivate/reactivate button | `can_deactivate_staff` |

The owner (`user.is_owner === true`) bypasses all permission checks and can see everything.

---

## Technology Rules — Non-Negotiable

These are the project's committed technology decisions. Do not introduce any alternative.

| Concern | Required | Forbidden |
|---|---|---|
| UI components | **Mantine UI** | Radix UI, raw HTML custom components |
| Forms | **Formik + Yup** | react-hook-form |
| Alerts / confirmations | **SweetAlert2** | `window.confirm()`, Mantine notifications |
| HTTP calls | **Axios via `api`** | `fetch`, a new axios instance |
| Language | **TypeScript strict mode** | JavaScript, `any` without justification |

Import the shared `api` instance, never create a new one:
```typescript
import api from '@client/common/api';
```

---

## Translation Keys — Mandatory

**Every user-visible string must come from the translation system. No raw string literals in JSX.**

Step 1 — add keys to `src/client/common/keys.tsx`:
```typescript
staff: {
  title:          'staff.title',
  subtitle:       'staff.subtitle',
  addButton:      'staff.addButton',
  // ... all labels, placeholders, errors, modal titles
}
```

Step 2 — add English values to `src/client/common/translations.tsx`:
```typescript
[KEYS.staff.title]: 'Staff',
[KEYS.staff.addButton]: 'Add Staff Member',
```

Step 3 — use in JSX:
```tsx
import { t } from '@client/common/translations';
import { KEYS } from '@client/common/keys';

<h1 className="ptitle">{t(KEYS.staff.title)}</h1>
```

**This rule has no exceptions.** Placeholders, error messages, modal titles, button labels, empty state text — all must use `t(KEYS.*)`.

---

## SweetAlert2 — Confirmations and Feedback

Use the shared helpers from `@client/common/utils/swal`. Do not call `Swal.fire()` directly.

```typescript
import { showConfirm, showSuccess, showError } from '@client/common/utils/swal';

// Deactivate confirmation
const result = await showConfirm('Deactivate staff?', 'They will not be able to log in.');
if (result.isConfirmed) { /* proceed */ }

// After successful create
await showSuccess('Staff member created', 'A welcome email has been sent to their inbox.');

// On API error
showError('Failed to create staff', err.response?.data?.errors?.[0]?.msg ?? t(KEYS.common.error));
```

---

## CSS and Styling

Use the existing CSS classes from `src/client/common/styles/portal.scss`. Do not write inline styles for layout.

Relevant classes already available:
- `.ptitle` — page heading
- `.psub` — page subtitle
- `.card` — white card container
- `.card-title` — card section heading
- `.label-text` — muted small text

For the data table, use Mantine's `Table` component.  
For the modal, use Mantine's `Modal` component.  
For the role selector, use Mantine's `Select` component.

---

## API Contract Alignment Test — Mandatory

Before marking this ticket done, you must write an alignment test at:
`src/test/staff.align.test.ts`

The test must:
1. Add a `staffMemberSchema` to `src/test/schemas.ts` that mirrors the `StaffMember` response shape
2. Verify `GET /api/staff` returns the correct shape
3. Verify `POST /api/staff` accepts the exact body the form sends and rejects missing required fields
4. Verify `PUT /api/staff/:id` accepts the correct body (no email field)
5. Verify sensitive fields (`password_hash`, `otp_code`) are never present in any response
6. Verify `PATCH /api/staff/:id/deactivate` toggles `is_active`

Run with:
```bash
yarn test:align
```

All alignment tests must pass green before you raise a PR.

---

## Definition of Done

- [ ] Staff list renders with name, email, role badge, active status indicator, and action buttons
- [ ] Pagination works (page/limit query params sent correctly)
- [ ] Create modal opens, validates with Yup, submits correct body, shows success message
- [ ] Edit modal pre-fills existing data, submits correct body (no email field)
- [ ] Deactivate/reactivate shows SweetAlert2 confirm before calling the API
- [ ] Permission flags respected — buttons hidden when user lacks the permission
- [ ] All text uses `t(KEYS.staff.*)` — zero raw string literals in JSX
- [ ] `staff.align.test.ts` written and passing
- [ ] `yarn test:align` passes green
- [ ] `npx tsc --noEmit` produces zero errors
- [ ] No files under `src/server/` modified
