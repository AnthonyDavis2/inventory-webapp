# AI Constitution
## Business Operations, Inventory, Manufacturing & Cost Management Platform

This constitution defines the non-negotiable rules, architectural decisions, and coding standards for this codebase. Every response, every file, and every line of code must comply with these rules. When a rule conflicts with a suggested approach, the rule wins. When a rule is ambiguous, ask before proceeding.

---

## 1. Project Identity

This is a **multi-tenant SaaS platform** built for the US market, targeting small manufacturers, wholesalers, and retailers. It is built and maintained by a **solo developer**. Every decision must be weighed against that constraint.

- Prefer third-party services over building from scratch
- Prefer managed infrastructure over self-hosted
- Prefer simple and correct over clever and complex
- Prefer shipping over perfecting
- Explicitly flag scope creep: "This is a Phase 2 item. Do you want to include it now or defer it?"

---

## 2. Technology Stack

These are fixed. Do not suggest alternatives unless a specific version has a critical bug or security issue, and if so, explain why before suggesting a change.

### Backend
| Concern | Technology |
|---|---|
| Framework | NestJS (latest) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL 15+ |
| ORM | Prisma (schema-first) |
| Cache | Redis (Upstash in production) |
| Queue | BullMQ + Redis |
| Auth | JWT + refresh tokens (HttpOnly cookie) + TOTP MFA |
| File Storage | S3-compatible (Cloudflare R2 in production) |
| Email | Resend |
| Payments | Stripe (Stripe Billing for subscriptions) |
| PDF Generation | Puppeteer or Gotenberg |
| Error Tracking | Sentry |
| Logging | Pino (structured JSON) |
| Tax | TaxJar or Avalara (do not build a tax engine) |
| Shipping | EasyPost or ShipStation (do not build carrier integrations) |
| Search | PostgreSQL pg_trgm + GIN indexes (MVP); Meilisearch (Phase 2) |
| Testing | Jest, Supertest |

### Frontend
| Concern | Technology |
|---|---|
| Framework | Nuxt 4 |
| Language | TypeScript (strict mode) |
| UI Library | Vue 3 (Composition API, `<script setup>` only) |
| Component Library | Nuxt UI |
| CSS | Tailwind CSS |
| State | Pinia (per-feature stores) |
| Forms | VeeValidate + Zod |
| Data Fetching | useFetch / useAsyncData + TanStack Query (Vue Query) |
| Charts | Chart.js via vue-chartjs |
| Barcode Scanning | ZXing-js or QuaggaJS (camera-based, browser only) |
| Testing | Vitest, Vue Test Utils, Playwright |

### Infrastructure (Production)
| Concern | Service |
|---|---|
| Frontend Hosting | Vercel |
| Backend Hosting | Railway or Render |
| Database | Neon or Railway PostgreSQL |
| Redis | Upstash |
| Storage | Cloudflare R2 |
| CI/CD | GitHub Actions |
| Uptime Monitoring | Better Uptime or UptimeRobot |

### Local Development
- Docker Compose for PostgreSQL and Redis
- `.env.development` for local secrets
- Never commit secrets to version control

---

## 3. Architecture Rules

### 3.1 Modular Monolith

This is a **modular monolith** — one deployable unit with strict internal module boundaries. It is not a microservices architecture. Do not suggest splitting services unless a module has been explicitly promoted to Phase 3.

- All modules live in the same NestJS application and Nuxt application
- Module boundaries are enforced via NestJS module encapsulation
- Modules communicate via domain events, not direct service injection across bounded contexts
- Module boundaries must be designed so any module could be extracted to a microservice in Phase 3 without data model changes

### 3.2 Domain-Driven Design

Organize all code by **business domain**, never by technical layer.

**Correct backend structure:**
```
src/modules/inventory/
├── controllers/
├── use-cases/
├── services/
├── repositories/
├── domain/
├── events/
├── dto/
├── types/
├── validators/
└── inventory.module.ts
```

**Forbidden backend structure — never do this:**
```
src/
├── controllers/    ← FORBIDDEN at root level
├── services/       ← FORBIDDEN at root level
├── repositories/   ← FORBIDDEN at root level
└── entities/       ← FORBIDDEN at root level
```

**Correct frontend structure:**
```
app/features/inventory/
├── pages/
├── components/
├── stores/
├── composables/
├── types/
├── schemas/
└── api/
```

**Forbidden frontend structure — never do this:**
```
app/
├── components/   ← FORBIDDEN as a global dumping ground
├── stores/       ← FORBIDDEN as a global dumping ground
└── pages/        ← FORBIDDEN without feature subfolders
```

### 3.3 Clean Architecture Layers (Backend)

Within each module, enforce strict layering:

```
HTTP Request
    ↓
Controller          ← thin; validate input, call use case, return response
    ↓
Use Case            ← one class per business action; owns all business logic
    ↓
Domain Service      ← shared logic used by multiple use cases within the module
    ↓
Repository          ← data access only; no business logic
    ↓
Prisma / Database
```

- Controllers must never contain business logic
- Use cases must never contain SQL or Prisma calls directly
- Repositories must never contain business logic
- Domain models are plain TypeScript classes; no Prisma types leak into domain layer
- DTOs validate input; domain models own business rules

### 3.4 Event-Driven Architecture

Use domain events for all significant business actions. Events decouple modules.

- Internal events: NestJS `EventEmitter2`
- Async jobs triggered by events: BullMQ
- Every major business action emits a domain event (see Event Catalog in main prompt)
- Event handlers must be idempotent (safe to replay)
- Events are named in past tense: `InventoryReceived`, `InvoicePaid`, `WorkOrderCompleted`
- Event payloads always include `orgId` as the first field

### 3.5 Shared Layer Rules

The shared layer is minimal. Business logic lives in feature modules, not the shared layer.

**Allowed in shared/core:**
- UI components used across 3+ features
- Pure utility functions (formatting, date math, currency display)
- Shared TypeScript types and interfaces
- Constants and enumerations
- Validation helpers
- HTTP client setup
- Auth guards and decorators

**Forbidden in shared/core:**
- Business logic of any kind
- Module-specific state
- Feature-specific components

---

## 4. Multi-Tenancy Rules

Tenant isolation is the most critical security requirement in the system. A breach that exposes one tenant's data to another is a catastrophic failure.

### 4.1 Every Business Table Has org_id

Every table that stores business data **must** have:

```sql
org_id UUID NOT NULL REFERENCES organizations(id)
```

No exceptions. If a table stores business data without `org_id`, it is a bug.

### 4.2 Row-Level Security (RLS) is Mandatory

All business data tables must have PostgreSQL Row-Level Security policies:

```sql
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON {table}
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

RLS is the last line of defense. The application layer also enforces `org_id` on every query (defense in depth). Both layers must be present.

### 4.3 Tenant Context Propagation

- JWT payload always contains `orgId` and `userId`
- NestJS middleware extracts tenant context from JWT on every request
- A `TenantContext` service provides `orgId` throughout the request lifecycle
- Every Prisma query that touches business data must include `where: { orgId: context.orgId }`
- The database session must be set before every query: `SET app.current_org_id = '{orgId}'`
- Never derive `orgId` from the request URL or body — always from the verified JWT

### 4.4 Tenant Isolation Test Requirement

Every module with business data must include a test that:
1. Creates two separate tenant organizations (Org A, Org B)
2. Creates data in Org A
3. Authenticates as a user of Org B
4. Attempts to read/write Org A's data
5. Asserts that the response is 404 or 403, never 200 with Org A's data

This test must pass before any module is considered complete.

---

## 5. Database Rules

### 5.1 Data Types

| Data | Type | Reason |
|---|---|---|
| All monetary values | `BIGINT` (integer cents) | Never float; floating point math is wrong for money |
| All IDs | `UUID` | Prevents enumeration attacks; no tenant leakage via sequential IDs |
| All timestamps | `TIMESTAMPTZ` | Always UTC; timezone-aware |
| Enum columns | `VARCHAR` with DB check constraint | Prisma enums; readable in raw SQL |
| JSON/flexible data | `JSONB` | Not `JSON`; supports indexing |
| Monetary display | Convert cents to dollars only at the presentation layer | Never store dollars |

### 5.2 Naming Conventions

- Tables: `snake_case`, plural (`inventory_ledger_entries`, `sales_orders`)
- Columns: `snake_case` (`org_id`, `created_at`, `unit_cost_cents`)
- Indexes: `idx_{table}_{columns}` (`idx_inventory_ledger_org_id_product_id`)
- Foreign keys: `{referenced_table_singular}_id` (`product_id`, `warehouse_id`)
- Prisma models: `PascalCase` (`InventoryLedgerEntry`, `SalesOrder`)

### 5.3 Required Columns on Every Business Table

```prisma
id         String   @id @default(uuid()) @db.Uuid
org_id     String   @db.Uuid
created_at DateTime @default(now()) @db.Timestamptz
updated_at DateTime @updatedAt @db.Timestamptz
created_by String?  @db.Uuid
updated_by String?  @db.Uuid
```

### 5.4 Soft Deletes

Never hard-delete business-critical records. Use soft deletes on all of:
- Products, product variants
- Customers, vendors
- Sales orders, purchase orders, invoices, credit memos
- Work orders, BOMs
- Warehouses, bin locations
- Users (deactivate, never delete)
- Chart of accounts entries

```prisma
deleted_at DateTime? @db.Timestamptz
deleted_by String?   @db.Uuid
```

- All queries must filter `WHERE deleted_at IS NULL` by default
- Provide restore functionality for recently soft-deleted records
- Hard deletes are only permitted on: user sessions, temporary upload files, draft records explicitly marked as disposable

### 5.5 Migrations

- All schema changes via Prisma Migrate — never edit the database directly
- Migrations are version-controlled and committed with the code that requires them
- Zero-downtime migration pattern: add new column → deploy code → backfill data → remove old column (separate deploy)
- Never rename a column in a single migration — it is equivalent to dropping and recreating it
- Seed scripts must exist for: global UOM library, default chart of accounts, default expense categories, default roles
- Migration naming: `{timestamp}_{descriptive_name}` (Prisma default)

### 5.6 Required PostgreSQL Extensions

Always enable in migrations:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 5.7 Indexing Requirements

Always index:
- Every `org_id` column (GIN or B-tree)
- Every foreign key column
- Every `status` or `state` enum column used in filters
- Every `created_at` column used in ORDER BY
- Every `deleted_at` column
- Text search columns: GIN index with `trgm_ops`

```sql
CREATE INDEX idx_{table}_org_id ON {table}(org_id);
CREATE INDEX idx_{table}_search ON {table} USING GIN (name gin_trgm_ops);
```

---

## 6. Inventory Ledger Rules

The inventory ledger is the most architecturally important subsystem. These rules are absolute.

### 6.1 The Ledger is the Source of Truth

Inventory balances are **derived** from ledger entries. There are no mutable `quantity` fields that represent current stock. Current quantity = `SUM(quantity) WHERE product_id = X AND warehouse_id = Y AND deleted_at IS NULL`.

Exception: a materialized view or cached balance is acceptable for performance, but it must always be reconcilable to the ledger sum. The cache is derived; the ledger is canonical.

### 6.2 Ledger Entries are Immutable

- Never UPDATE an inventory ledger entry
- Never DELETE an inventory ledger entry
- Corrections are made via: reversal entry (negative of original) + new correct entry
- Both the reversal and the correction must reference the original entry ID

### 6.3 Every Ledger Entry Requires a Reference

No orphaned adjustments. Every entry must have:
- `reference_type` (the type of business document that caused the movement)
- `reference_id` (the ID of that document)

Manual adjustments must have:
- A reason code (from a configurable list)
- An approver (user who authorized the adjustment, if required by org settings)

### 6.4 UOM Normalization in the Ledger

All ledger quantities are stored in the **stocking UOM** of the product. Conversions from purchase UOM or sales UOM happen before the ledger entry is written. The ledger never contains mixed UOMs for the same product.

### 6.5 Costing on Ledger Entries

Every outbound ledger entry must carry:
- `unit_cost_cents BIGINT` — the cost per stocking unit at the time of the movement
- `total_cost_cents BIGINT` — `quantity × unit_cost_cents`

For FIFO: cost is determined by consuming the oldest cost layers first.
For Weighted Average: cost is the current running average at the time of the movement.

Cost must be calculated and locked at the time the entry is written. It must never be recalculated after posting.

### 6.6 Ledger Movement Types (Enum)

Only these values are valid. Adding a new movement type requires updating this constitution.

```
PURCHASE_RECEIPT
PURCHASE_RETURN
SALES_SHIPMENT
SALES_RETURN
PRODUCTION_CONSUMPTION
PRODUCTION_OUTPUT
INVENTORY_ADJUSTMENT
INVENTORY_TRANSFER
OPENING_BALANCE
DAMAGED
EXPIRED
CYCLE_COUNT
ASSEMBLY_CONSUMPTION
ASSEMBLY_OUTPUT
```

---

## 7. Financial Rules

### 7.1 Money is Always Integers

- Store all monetary values as `BIGINT` representing cents (USD for MVP)
- `$12.99` is stored as `1299`
- `$0.01` is stored as `1`
- Never use `FLOAT`, `REAL`, or `DOUBLE PRECISION` for money — ever
- Never use JavaScript `number` for money in calculations — use a cents integer library or BigInt
- Convert to display format (dollars with 2 decimal places) only at the UI layer
- All financial calculations happen in integer cent arithmetic

### 7.2 Currency Fields

Every financial table must include `currency_code VARCHAR(3) NOT NULL DEFAULT 'USD'` even if multi-currency is not yet implemented. This makes Phase 3 multi-currency support a non-breaking migration.

### 7.3 Tax

- Tax amounts are calculated at invoice creation time via TaxJar/Avalara (or manual rate for MVP)
- Tax is stored on the invoice line item as `tax_amount_cents BIGINT`
- Tax is **never** recalculated after an invoice is finalized (voiding and reissuing is the correct path)
- Tax-exempt status is stored on the customer record with certificate number and expiration date
- Tax-exempt products/categories are flagged at the product category level

### 7.4 Costing Method

The inventory costing method (FIFO or Weighted Average) is:
- Selected during org onboarding (Step 5)
- Stored on the organization record
- **Locked after the first inventory transaction is posted**
- Changing costing method after transactions exist requires full revaluation (not supported in MVP)

For **FIFO**: maintain cost layer records per product per warehouse. Each receipt creates a new layer. Outbound movements consume from the oldest layer first.

For **Weighted Average**: maintain a running average cost per product per warehouse. Recalculate on every receipt: `new_avg = (existing_qty × existing_avg + received_qty × received_cost) / (existing_qty + received_qty)`.

---

## 8. Units of Measure Rules

UOM is a foundational module. It must exist before inventory, purchasing, or manufacturing can function.

### 8.1 UOM Assignments Per Product

Each product has three UOM assignments:
- `purchase_uom_id` — the UOM used on purchase orders and receiving
- `stocking_uom_id` — the UOM used in the inventory ledger (canonical)
- `sales_uom_id` — the UOM used on sales orders and invoices

These may be the same UOM or different UOMs with a defined conversion ratio.

### 8.2 Conversions are Bidirectional

A conversion ratio between two UOMs must work in both directions:
- `1 case = 12 each` → also means `1 each = 0.08333... case`
- Store as: `from_uom_id`, `to_uom_id`, `conversion_factor DECIMAL(18,8)`

### 8.3 BOM Lines Carry Their Own UOM

Each BOM line specifies the quantity in its own UOM, independent of the component's stocking UOM. The system converts to stocking UOM when calculating material requirements and when posting consumption ledger entries.

### 8.4 Ledger is Always in Stocking UOM

When creating an inventory ledger entry, always convert to the stocking UOM before writing. The ledger never mixes UOMs for the same product.

---

## 9. API Rules

### 9.1 REST Conventions

- Base path: `/api/v1/{resource}`
- Resources are plural nouns: `/products`, `/sales-orders`, `/purchase-orders`
- Actions on resources use HTTP verbs correctly:
  - `GET /products` — list
  - `GET /products/:id` — get one
  - `POST /products` — create
  - `PATCH /products/:id` — partial update
  - `DELETE /products/:id` — soft delete (sets `deleted_at`)
- Sub-resources: `GET /sales-orders/:id/line-items`
- Actions that don't map to CRUD: `POST /sales-orders/:id/approve`, `POST /invoices/:id/void`

### 9.2 Tenant Context Never Comes from the Request

- `orgId` is always derived from the authenticated JWT — never from the URL, query string, or request body
- A request that tries to pass `orgId` in the body must ignore that field
- Guard: `@UseGuards(JwtAuthGuard, TenantGuard)` on every business endpoint

### 9.3 Standard Error Response

All errors must return this shape:

```typescript
{
  statusCode: number;
  error: string;          // machine-readable error code (VALIDATION_ERROR, NOT_FOUND, etc.)
  message: string;        // human-readable summary
  details?: Array<{       // optional field-level errors
    field: string;
    message: string;
  }>;
  requestId: string;      // for log correlation
  timestamp: string;      // ISO 8601
}
```

Never return raw error messages, stack traces, or Prisma error objects to the client.

### 9.4 Pagination

- All list endpoints are paginated — never return unbounded result sets
- Default page size: 25. Maximum: 100.
- Cursor-based pagination for large datasets (inventory ledger, audit log)
- Offset-based pagination for standard list views

```typescript
// Cursor response shape
{
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  }
}
```

### 9.5 Input Validation

- All inputs validated with `class-validator` decorators on DTOs
- Validation happens in the NestJS `ValidationPipe` (global)
- Never trust client input; always validate on the server
- `orgId` is never a validatable input field — it comes from the JWT only
- `whitelist: true` on ValidationPipe — strip unknown fields
- `forbidNonWhitelisted: true` — reject requests with extra fields

### 9.6 Rate Limiting

- 100 requests/minute per user
- 1000 requests/minute per organization
- Implemented via Redis counters
- Rate limit headers on every response: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- 429 response includes `Retry-After` header
- Barcode scan endpoints have a higher limit (warehouse operations are high-frequency)

### 9.7 OpenAPI Documentation

- All endpoints documented via `@nestjs/swagger` decorators
- DTOs annotated with `@ApiProperty()`
- Auto-generate OpenAPI spec at `/api/docs`
- Keep documentation in sync with implementation — undocumented endpoints are incomplete

---

## 10. Authentication & Security Rules

### 10.1 JWT Configuration

- Access token expiry: 15 minutes
- Refresh token expiry: 30 days
- Refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies
- Refresh token rotation: new refresh token issued on every use; old token invalidated
- Refresh tokens stored in Redis (for revocation); also hashed in DB for audit
- Token payload: `{ sub: userId, orgId, role, iat, exp }`

### 10.2 Password Rules

- Minimum 12 characters
- Must include uppercase, lowercase, number, special character
- Hashed with bcrypt, cost factor 12
- Cannot reuse last 5 passwords
- HaveIBeenPwned API check on password set/change

### 10.3 MFA

- TOTP-based (Google Authenticator, Authy) via `otplib`
- Required for Owner and Admin roles
- Optional but recommended for all roles
- Backup codes: generate 10 single-use codes on MFA setup
- MFA bypass for automated service accounts is not permitted

### 10.4 Security Headers

Apply via Helmet.js on every response:
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `X-XSS-Protection`

### 10.5 Input Security

- Parameterized queries only — Prisma handles this; never concatenate SQL strings
- All file uploads: validate MIME type, enforce size limits, store with a UUID filename (never use the original filename)
- Never log request bodies that may contain credentials or PII
- Sanitize all user-generated content before storing (strip HTML unless explicitly a rich text field)

---

## 11. Role-Based Access Control Rules

### 11.1 Fixed Roles (MVP)

These roles are fixed for MVP. Custom permission matrices are Phase 2.

| Role | Key Permissions |
|---|---|
| `OWNER` | Everything including billing, org deletion, all user management |
| `ADMIN` | Everything except billing management |
| `MANAGER` | All operational modules, approve workflows, all reports |
| `ACCOUNTANT` | Financial data, invoices, expenses, reports. Read-only on inventory |
| `PURCHASING_STAFF` | Vendors, POs, receiving |
| `WAREHOUSE_STAFF` | Inventory, receiving, picking, cycle counts. No financial data |
| `PRODUCTION_STAFF` | Work orders, BOM view, material consumption. No financial data |
| `SALES_STAFF` | Customers, quotes, sales orders, invoices. Cannot see unit costs |
| `VIEWER` | Read-only on modules explicitly granted |

### 11.2 Role Guards

- Use `@Roles()` decorator + `RolesGuard` on every endpoint
- Define the minimum role required for each action
- Sales staff must never see unit cost or margin data — this is enforced at the API response serialization layer, not just the UI
- Use `@SerializeOptions({ groups: ['financial'] })` to conditionally include cost fields based on role

### 11.3 Sensitive Data Visibility

| Data | Hidden from |
|---|---|
| Unit cost, standard cost | `SALES_STAFF`, `WAREHOUSE_STAFF`, `PRODUCTION_STAFF` |
| Gross margin % | `SALES_STAFF`, `WAREHOUSE_STAFF`, `PRODUCTION_STAFF` |
| Customer payment terms | `WAREHOUSE_STAFF`, `PRODUCTION_STAFF` |
| Employee payroll amounts | All except `OWNER`, `ADMIN`, `ACCOUNTANT` |
| Stripe billing details | All except `OWNER` |

---

## 12. Background Jobs Rules

### 12.1 BullMQ Queue Names

Use consistent queue names across the codebase:

```
pdf-generation
email-delivery
notification-dispatch
inventory-reorder-check
expiring-lot-check
overdue-invoice-check
cost-recalculation
report-generation
csv-import
csv-export
stripe-webhook-processing
```

### 12.2 Job Requirements

Every job must:
- Include `orgId` in the job payload
- Be idempotent (safe to run multiple times with same result)
- Have a defined retry strategy (max attempts, backoff)
- Log start, completion, and failure with structured fields
- Emit a domain event on completion or failure
- Have a configurable concurrency limit

### 12.3 Scheduled Jobs

| Job | Schedule | Purpose |
|---|---|---|
| `inventory-reorder-check` | Every 4 hours | Flag products below reorder point |
| `expiring-lot-check` | Daily at 2:00 AM UTC | Alert on lots expiring within threshold |
| `overdue-invoice-check` | Daily at 6:00 AM UTC | Flag invoices past due date |
| `trial-expiry-check` | Daily at 8:00 AM UTC | Warn orgs approaching trial end |

---

## 13. Notification Rules

### 13.1 Notification Architecture

In-app notifications and email notifications are separate concerns handled by the `notifications` module.

- Domain events trigger notification handlers
- Handlers determine which users in the org receive the notification based on role
- In-app: stored in `notifications` table; real-time delivery via SSE or WebSocket (Phase 2; polling for MVP)
- Email: queued in `email-delivery` BullMQ queue; sent via Resend

### 13.2 User Preferences

Each user has per-notification-type preferences:
- `in_app: boolean`
- `email: boolean`

Preferences are respected for non-critical notifications. Critical notifications (subscription payment failed, account suspension) ignore preferences and always send.

---

## 14. File Storage Rules

### 14.1 Path Structure

All files are namespaced by org:

```
/{orgId}/logos/{uuid}.{ext}
/{orgId}/products/{uuid}.{ext}
/{orgId}/documents/{year}/{month}/{uuid}.pdf
/{orgId}/imports/{uuid}.csv
/{orgId}/exports/{uuid}.csv
/{orgId}/attachments/{uuid}.{ext}
```

### 14.2 Access Rules

- Never expose S3/R2 bucket URLs directly
- Always serve files via pre-signed URLs with expiry:
  - Images: 24-hour expiry
  - Documents: 1-hour expiry
  - Exports: 1-hour expiry
- Pre-signed URL generation is a server-side operation only

### 14.3 Upload Rules

- Validate MIME type server-side (never trust Content-Type header alone; check magic bytes)
- Size limits: images 5MB, documents 25MB, CSV imports 10MB
- Store files with UUID filenames, never original filenames
- Record the original filename in the database for display purposes

---

## 15. Onboarding Rules

### 15.1 Onboarding is a Gate

A newly created organization cannot access any operational module until onboarding is complete. The system must:
- Track completion of each onboarding step on the `organizations` table
- Return a persistent incomplete-onboarding indicator in the auth JWT or org profile response
- Redirect users to the onboarding wizard if onboarding is incomplete
- The only exception: billing setup (can always be accessed)

### 15.2 Onboarding Steps (in order)

1. Organization profile (name, address, logo, timezone, fiscal year)
2. Units of measure (select from global library, add custom)
3. Warehouse setup (at least one required)
4. Tax settings (nexus states, provider, or manual rate)
5. Inventory costing method (FIFO or Weighted Average — **locked after first transaction**)
6. Chart of accounts (pre-populated, customizable)
7. Invite team members (optional to complete, but prompted)

### 15.3 Costing Method Lock

Once any inventory ledger entry exists for an organization, the costing method field becomes read-only. Display a clear explanation in the UI: "Your costing method is locked because inventory transactions exist. Contact support to change it."

---

## 16. Data Import Rules

### 16.1 Import Pipeline

Every CSV import follows this sequence:

```
Upload → Parse → Validate → Preview (with error highlighting) → Confirm → Process → Log
```

- Processing always happens in a background job (`csv-import` queue)
- Never block the HTTP request on import processing
- Return a job ID immediately; client polls for status

### 16.2 Import Requirements

- Provide downloadable CSV templates with headers and example rows for each importable entity
- Validate before any records are written — do not partially write on validation failure
- Support partial import: write valid rows, flag invalid rows in the error report
- Error report: downloadable CSV with original row + error message column
- Idempotent: use an `external_id` or row hash to prevent duplicate imports
- Rollback: soft-delete all records from an import within 24 hours using `import_batch_id`

### 16.3 Importable Entities (MVP)

- Products / SKUs
- Raw materials / components
- Vendors (with contacts)
- Customers (with contacts)
- Opening inventory balances (creates `OPENING_BALANCE` ledger entries)

---

## 17. Document Generation Rules

### 17.1 PDF Generation

- All PDFs generated server-side (Puppeteer or Gotenberg)
- Generated asynchronously via `pdf-generation` BullMQ queue
- Stored in S3/R2 at `/{orgId}/documents/{year}/{month}/{uuid}.pdf`
- Returned to client via pre-signed URL (1-hour expiry)
- Notify user via in-app notification when PDF is ready

### 17.2 Document Branding

Every document type uses the organization's:
- Logo (from onboarding upload)
- Company name, address, phone, email
- Custom header/footer text (configurable per document type)
- Document number prefix (configurable, e.g. `INV-`, `PO-`)

### 17.3 Document Number Sequences

- Each document type has its own sequence per organization
- Sequences are atomic (no gaps, no duplicates) — use PostgreSQL sequences or a locked counter
- Format: `{PREFIX}{YEAR}-{PADDED_NUMBER}` (e.g. `INV-2024-00001`)
- Never share sequences across tenants

---

## 18. Testing Rules

### 18.1 What Must Be Tested

**Backend — required for every module:**
- Unit tests for every use case class
- Unit tests for all financial calculations (costing, margin, UOM conversion)
- Integration tests for all repository methods
- API tests for every endpoint (happy path + validation errors + auth errors)
- Tenant isolation test (see section 4.4)

**Frontend — required for critical features:**
- Unit tests for all Pinia stores
- Unit tests for all Zod validation schemas
- Unit tests for financial display utilities
- E2E tests for all critical user journeys

### 18.2 Critical Test Coverage (Non-Negotiable)

These specific paths must have test coverage before shipping:

| Path | Test Type | Why |
|---|---|---|
| Inventory ledger: every movement type | Integration | Wrong balances = wrong business decisions |
| FIFO cost layer consumption order | Unit | Wrong COGS = wrong financials |
| Weighted average recalculation | Unit | Wrong cost = wrong margins |
| BOM cost rollup (multi-level) | Unit | Wrong standard cost = bad pricing |
| Tenant data isolation | Integration | Security requirement |
| Stripe webhook → subscription update | Integration | Revenue-critical |
| Onboarding wizard (all 7 steps) | E2E | Activation-critical |
| Sales order → fulfill → invoice → payment | E2E | Core user journey |
| Purchase order → receive → ledger entry | E2E | Core user journey |

### 18.3 Coverage Target

- Business logic (use cases, domain models, calculations): 80% minimum
- Repositories and controllers: 60% minimum
- Frontend stores and schemas: 70% minimum
- Do not chase coverage with trivial tests; cover the logic that matters

### 18.4 Test Database

- Integration tests use a separate PostgreSQL database (never run against production or development data)
- Each test suite creates its own tenant org and tears it down after
- Use `prisma.$transaction` for test setup/teardown to ensure clean state
- Never use `jest.mock()` for the database layer in integration tests — test against a real database

---

## 19. Observability Rules

### 19.1 Logging

Use Pino for all logging. Every log entry must include:

```json
{
  "timestamp": "ISO 8601",
  "level": "info|warn|error|debug",
  "requestId": "uuid",
  "orgId": "uuid or null",
  "userId": "uuid or null",
  "module": "inventory|sales|...",
  "message": "...",
  "durationMs": 42
}
```

- Never log passwords, tokens, or full credit card numbers
- PII (email, name, address) may be logged at `debug` level only; never at `info` or above in production
- Log all API requests at `info` level with: method, path, status code, duration
- Log all background job starts and completions at `info` level
- Log all errors at `error` level with full stack trace

### 19.2 Error Tracking

- All unhandled exceptions captured by Sentry
- Sentry context always includes `orgId` and `userId` (not email or name)
- Source maps uploaded to Sentry for readable stack traces
- Alert on: new error types, error rate > 1% of requests

### 19.3 Health Checks

```
GET /health          → 200 if app is running
GET /health/detailed → checks DB, Redis, queue connectivity
```

Health check endpoints must not require authentication.

---

## 20. Subscription & Billing Rules

### 20.1 Stripe is Authoritative

Stripe is the source of truth for subscription status. The local database caches subscription state but always defers to Stripe webhooks for updates.

- Never manually update subscription status in the database without a corresponding Stripe event
- Process Stripe webhooks idempotently using Stripe event IDs
- Stripe webhook signature must be verified on every incoming webhook

### 20.2 Plan Limits Enforcement

| Plan | Users | Products | Warehouses |
|---|---|---|---|
| Starter | 2 | 500 | 1 |
| Growth | 10 | 5,000 | 3 |
| Business | 25 | Unlimited | 10 |

- Check limits before creating new records (user, product, warehouse)
- Return a clear error with upgrade prompt when limit is reached
- Display current usage vs. limit in org settings

### 20.3 Trial Behavior

- 14-day trial, no credit card required
- Full Business plan feature access during trial
- Send warning emails at: 7 days remaining, 3 days remaining, 1 day remaining, expiry
- On expiry: switch to read-only mode (no creates or updates)
- Read-only mode must be enforced at the API layer, not just the UI

### 20.4 Failed Payment / Dunning

- Retry schedule: Day 1, Day 3, Day 7 after failure
- Send email after each failed attempt
- After 7 days without payment: suspend account (read-only mode)
- Suspension enforced at the API layer
- On successful payment: immediately restore full access

---

## 21. Scope Enforcement Rules

### 21.1 MVP is Locked

The following are **not** in MVP scope. If asked to implement them, flag them and ask for explicit confirmation before proceeding:

- Multi-currency
- QuickBooks / Xero API sync (CSV export is MVP; live sync is Phase 2)
- TaxJar / Avalara API integration (manual tax rate is MVP)
- EasyPost / ShipStation integration (record tracking number manually is MVP)
- Offline mode / service worker
- Custom RBAC permissions (fixed roles are MVP)
- Meilisearch (pg_trgm is MVP)
- Demand forecasting / automated reorder POs
- Three-way match (PO → Receipt → Vendor Invoice)
- Customer portal
- Outbound webhooks / event API
- ZPL barcode label printing
- Multi-language / i18n
- Marketplace integrations
- Native mobile app
- SOC 2 certification
- Enterprise SSO

### 21.2 How to Handle Out-of-Scope Requests

When a request would add Phase 2 or Phase 3 functionality, respond with:

> "This is a Phase 2 item per the MVP scope definition. The MVP approach is [X]. Do you want to defer this to Phase 2 or include it now? Including it now will delay MVP launch."

Do not silently implement out-of-scope features.

---

## 22. Code Quality Rules

### 22.1 TypeScript

- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- No `any` types — use `unknown` and narrow, or define a proper type
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why
- Prefer `interface` for object shapes, `type` for unions and aliases
- All async functions return typed Promises
- No implicit `undefined` — use explicit optional types

### 22.2 NestJS Patterns

- One use case per class, one public method (`execute()`)
- Controllers are thin: validate input → call use case → return response
- Use `@Injectable()` on all services, repositories, and use cases
- Use `@Module()` exports to control what is accessible outside the module
- Do not use `forwardRef()` — circular dependencies indicate a design problem; fix the design

### 22.3 Vue / Nuxt Patterns

- `<script setup>` syntax only — no Options API
- One responsibility per component
- Props are typed with `defineProps<{...}>()`
- Emits are typed with `defineEmits<{...}>()`
- Composables are named `use{Feature}{Action}` (e.g. `useInventorySearch`)
- Pinia stores are named `use{Feature}Store` (e.g. `useInventoryStore`)
- No business logic in components — move to composables or stores
- No API calls in components — call via composables or stores

### 22.4 Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Files (backend) | `kebab-case` | `create-sales-order.use-case.ts` |
| Files (frontend) | `PascalCase` for components, `kebab-case` for others | `ProductCard.vue`, `use-inventory-search.ts` |
| Classes | `PascalCase` | `CreateSalesOrderUseCase` |
| Interfaces | `PascalCase` with `I` prefix for structural contracts | `IInventoryRepository` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_IMPORT_FILE_SIZE_BYTES` |
| Env vars | `SCREAMING_SNAKE_CASE` | `DATABASE_URL`, `STRIPE_SECRET_KEY` |
| Events | `PascalCase`, past tense | `SalesOrderCreated` |
| Database tables | `snake_case`, plural | `inventory_ledger_entries` |
| API routes | `kebab-case`, plural | `/sales-orders`, `/purchase-orders` |

### 22.5 Comments and Documentation

- Write code that explains itself through naming — minimize inline comments
- Use JSDoc on all public use case `execute()` methods and repository interfaces
- Every module must have a `README.md` describing its purpose, public API, and key business rules
- Document all environment variables in the root `README.md`
- No TODO comments in committed code — use GitHub Issues instead

---

## 23. Git and Release Rules

### 23.1 Branch Strategy

- `main` — always deployable to production
- `develop` — integration branch (optional for solo dev; merge feature branches directly to main if using trunk-based development)
- `feature/{ticket-number}-{description}` — feature branches
- `fix/{ticket-number}-{description}` — bug fix branches
- `chore/{description}` — non-functional changes

### 23.2 Commit Messages

Follow Conventional Commits:

```
type(scope): description

feat(inventory): add FIFO cost layer consumption
fix(auth): correct refresh token rotation on concurrent requests
chore(deps): upgrade Prisma to 5.x
test(sales): add tenant isolation tests for sales orders
docs(readme): document required environment variables
```

Types: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`, `perf`

### 23.3 CI/CD Gates

No code merges to `main` without passing:
1. TypeScript type check (`tsc --noEmit`)
2. Lint (`eslint`)
3. Unit tests (`jest --testPathPattern=unit`)
4. Integration tests (`jest --testPathPattern=integration`)
5. Build succeeds (`nest build`, `nuxt build`)

Database migrations run automatically on deploy to staging. Production deploys require a manual approval gate.

---

## 24. What to Do When Uncertain

1. **If a rule in this constitution is ambiguous** — ask for clarification before proceeding.
2. **If a requirement conflicts with a rule** — flag the conflict explicitly and ask how to resolve it.
3. **If a feature request is out of MVP scope** — flag it and ask whether to defer or include.
4. **If a technical decision has significant trade-offs** — present the options with trade-offs before choosing.
5. **If an architectural decision would be hard to reverse** — treat it as high-risk, raise it explicitly, and design carefully.
6. **If something feels wrong** — say so. A well-scoped MVP ships. A perfectly specced system that never launches helps no one.
