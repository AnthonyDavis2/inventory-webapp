# Module Dependency Map

Last updated: 2026-06-24

This document defines the NestJS backend module dependency order and the build sequence. Modules higher in the dependency tree must be built before modules that depend on them.

---

## Dependency Tree

```
                         ┌──────────────────┐
                         │   core/config    │  (no deps)
                         │   core/database  │  (no deps)
                         └────────┬─────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    core/audit              │
                    │    core/events             │
                    │    core/storage            │
                    │    core/mail               │
                    │    core/pdf                │
                    │    core/queue              │
                    │    core/search             │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    modules/organizations   │  depends on: core/*
                    │    modules/users           │  depends on: organizations
                    │    modules/billing         │  depends on: organizations, users
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    core/auth               │  depends on: users, organizations
                    │    core/tenant             │  depends on: organizations
                    └─────────────┬──────────────┘
                                  │
               ┌──────────────────▼──────────────────────┐
               │            FOUNDATION MODULES            │
               │                                          │
               │   modules/uom          (no biz deps)     │
               │   modules/warehouses   (no biz deps)     │
               └──────────────────┬──────────────────────┘
                                  │
               ┌──────────────────▼──────────────────────┐
               │            CATALOG MODULE                │
               │                                          │
               │   modules/products                       │
               │   depends on: uom, warehouses            │
               └──────────────────┬──────────────────────┘
                                  │
          ┌───────────────────────▼────────────────────────┐
          │              INVENTORY MODULE                   │
          │                                                 │
          │   modules/inventory   (ledger, lots, serials)   │
          │   depends on: products, warehouses, uom         │
          └───────────┬───────────────────────┬─────────────┘
                      │                       │
         ┌────────────▼──────────┐  ┌─────────▼─────────────┐
         │   PROCUREMENT MODULE  │  │   SALES MODULE        │
         │                       │  │                       │
         │   modules/vendors     │  │   modules/customers   │
         │   modules/purchasing  │  │   modules/pricing     │
         │                       │  │   modules/sales       │
         │ depends on:           │  │   modules/invoicing   │
         │   inventory, products │  │                       │
         │   uom, warehouses     │  │ depends on:           │
         └────────────┬──────────┘  │   inventory, products │
                      │             │   uom, pricing        │
                      │             └─────────┬─────────────┘
                      │                       │
                      └───────────┬───────────┘
                                  │
               ┌──────────────────▼──────────────────────┐
               │          MANUFACTURING MODULE            │
               │                                          │
               │   modules/manufacturing  (BOM, WO, QC)  │
               │   depends on: inventory, products, uom  │
               └──────────────────┬──────────────────────┘
                                  │
               ┌──────────────────▼──────────────────────┐
               │            COSTING MODULE                │
               │                                          │
               │   modules/costing                        │
               │   depends on: manufacturing, inventory   │
               │               purchasing, products       │
               └──────────────────┬──────────────────────┘
                                  │
          ┌───────────────────────▼────────────────────────┐
          │              SUPPORT MODULES                    │
          │   (depend on most of the above)                 │
          │                                                 │
          │   modules/expenses                              │
          │   modules/accounting                            │
          │   modules/reporting                             │
          │   modules/notifications                         │
          │   modules/imports                               │
          └────────────────────────────────────────────────┘
```

---

## Build Order (Implementation Sequence)

Build in this order. Each phase unlocks the next.

### Phase 1 — Core Infrastructure
1. `core/config` — env validation, ConfigModule setup
2. `core/database` — Prisma client, health check
3. `core/auth` — JWT strategy, guards, decorators
4. `core/tenant` — TenantContext middleware
5. `core/audit` — AuditLogService (used by everything)
6. `core/events` — EventEmitter2 setup
7. `core/queue` — BullMQ setup, queue definitions
8. `core/storage` — S3/R2 abstraction
9. `core/mail` — Resend abstraction
10. `core/pdf` — Gotenberg abstraction
11. `core/search` — pg_trgm search abstraction

### Phase 2 — Platform
12. `modules/organizations` — org CRUD, onboarding state tracking
13. `modules/users` — user CRUD, password, sessions, MFA, RBAC guards
14. `modules/billing` — Stripe webhooks, subscription management, plan limits

### Phase 3 — Foundation (UOM + Warehouses)
15. `modules/uom` — global UOM library, custom UOMs, conversion ratios
16. `modules/warehouses` — warehouse CRUD, bin locations

### Phase 4 — Catalog
17. `modules/products` — product CRUD, variants, categories, barcodes, images

### Phase 5 — Inventory (Most Critical)
18. `modules/inventory` — ledger, FIFO layers, WAC, lots, serials, adjustments, transfers, cycle counts

### Phase 6 — Procurement
19. `modules/vendors` — vendor CRUD, contacts, price lists
20. `modules/purchasing` — PO lifecycle, receiving, landed costs, reorder rules

### Phase 7 — Sales
21. `modules/customers` — customer CRUD, groups, addresses, contacts
22. `modules/pricing` — price lists, rules engine
23. `modules/sales` — quotes, orders, fulfillment, shipments, returns
24. `modules/invoicing` — invoices, payments, credit memos, Stripe integration

### Phase 8 — Manufacturing
25. `modules/manufacturing` — BOM, BOM versions, work orders, QC, scrap

### Phase 9 — Costing & Reporting
26. `modules/costing` — standard cost, BOM cost builder, overhead allocation, margin tracking
27. `modules/expenses` — expense categories, recurring expenses, receipt attachments
28. `modules/accounting` — chart of accounts, journal entry mapping, CSV export

### Phase 10 — Platform Support
29. `modules/reporting` — dashboard aggregations, report generation
30. `modules/notifications` — notification records, user preferences, email queuing
31. `modules/imports` — CSV import pipeline, templates, job processor
32. `modules/audit` — audit log viewer (read-side of core/audit)

---

## Cross-Module Communication Rules

- Modules communicate **only via domain events** (EventEmitter2) or by injecting a public service from an exported module
- A module may **not** import a repository from another module — only services/use cases
- Circular dependencies (`forwardRef`) are **forbidden** — they indicate a design problem
- The `inventory` module is the most depended-upon module; keep its public API stable

### Allowed direct imports (non-event)
These modules export services that others may inject:

| Exported By | May Be Injected By |
|---|---|
| `uom` | products, inventory, purchasing, sales, manufacturing |
| `products` | inventory, purchasing, sales, manufacturing, costing |
| `warehouses` | inventory, purchasing |
| `inventory` | purchasing, sales, manufacturing, costing |
| `pricing` | sales |
| `customers` | sales, invoicing |
| `vendors` | purchasing |

### Event-Only Communication (no direct import)
These flows cross bounded context boundaries and must use events:

| Emitter | Event | Handlers |
|---|---|---|
| `purchasing` | `PurchaseOrderReceived` | `inventory` (create ledger entries), `notifications` |
| `sales` | `SalesOrderFulfilled` | `inventory` (create ledger entries), `invoicing`, `notifications` |
| `manufacturing` | `WorkOrderCompleted` | `inventory` (consume + output), `costing`, `notifications` |
| `invoicing` | `InvoicePaid` | `accounting`, `notifications` |
| `billing` | `SubscriptionCancelled` | `organizations` (set read-only), `notifications` |
| `costing` | `ComponentCostChanged` | `costing` (recalculate BOM costs — self-triggered) |
| `inventory` | `LotExpiryApproaching` | `notifications` |
| `purchasing` | `PurchaseOrderOverdue` | `notifications` |

---

## Frontend Feature Module Build Order

Build in parallel with backend phases where possible.

1. Auth pages (login, register, MFA setup, password reset)
2. Onboarding wizard (7 steps)
3. Organization settings
4. User management
5. Billing / subscription pages
6. UOM management
7. Warehouse + bin management
8. Product catalog (list, create, edit, variants, barcodes)
9. Inventory dashboard + ledger viewer + adjustments
10. Vendor management
11. Purchase orders + receiving
12. Customer management
13. Price lists
14. Quotes + sales orders + fulfillment
15. Invoicing + payments
16. BOM builder + work orders
17. Costing dashboard
18. Expenses
19. Reporting dashboards
20. Notifications
21. CSV import tool
22. Audit log viewer
