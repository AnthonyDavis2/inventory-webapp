# Sitemap & Navigation Structure

Last updated: 2026-06-24

---

## URL Structure

All authenticated routes are prefixed with `/app`. Public routes (auth, marketing) are at root.

```
/                           → Marketing landing page (out of scope for MVP)
/login                      → Login
/register                   → Register new org
/forgot-password            → Password reset request
/reset-password/:token      → Password reset form
/accept-invite/:token       → Accept team invitation
/verify-mfa                 → MFA verification step

/onboarding                 → Onboarding wizard (redirects to /onboarding/1 if incomplete)
/onboarding/1               → Step 1: Organization Profile
/onboarding/2               → Step 2: Units of Measure
/onboarding/3               → Step 3: Warehouse Setup
/onboarding/4               → Step 4: Tax Settings
/onboarding/5               → Step 5: Costing Method
/onboarding/6               → Step 6: Chart of Accounts
/onboarding/7               → Step 7: Invite Team Members

/app                        → Redirect → /app/dashboard
/app/dashboard              → Executive Dashboard

/app/products               → Product List
/app/products/new           → Create Product
/app/products/:id           → Product Detail
/app/products/:id/edit      → Edit Product
/app/products/categories    → Category Management
/app/products/import        → CSV Import (products)

/app/inventory              → Inventory Dashboard
/app/inventory/ledger       → Inventory Ledger (all movements)
/app/inventory/adjustments  → Inventory Adjustments
/app/inventory/adjustments/new → Create Adjustment
/app/inventory/transfers    → Inventory Transfers
/app/inventory/transfers/new → Create Transfer
/app/inventory/cycle-counts → Cycle Counts
/app/inventory/cycle-counts/new → Create Cycle Count
/app/inventory/lots         → Lot / Batch List
/app/inventory/lots/:id     → Lot Detail + Trace
/app/inventory/serials      → Serial Number List

/app/warehouses             → Warehouse List
/app/warehouses/new         → Create Warehouse
/app/warehouses/:id         → Warehouse Detail + Bin Locations
/app/warehouses/:id/edit    → Edit Warehouse

/app/vendors                → Vendor List
/app/vendors/new            → Create Vendor
/app/vendors/:id            → Vendor Detail (profile, contacts, POs, pricing)
/app/vendors/:id/edit       → Edit Vendor

/app/purchasing             → Purchasing Dashboard
/app/purchasing/orders      → Purchase Order List
/app/purchasing/orders/new  → Create PO
/app/purchasing/orders/:id  → PO Detail
/app/purchasing/orders/:id/edit → Edit PO
/app/purchasing/orders/:id/receive → Receiving Wizard
/app/purchasing/receipts    → All Receipts List
/app/purchasing/recommendations → Reorder Recommendations

/app/customers              → Customer List
/app/customers/new          → Create Customer
/app/customers/:id          → Customer Detail (profile, orders, invoices, profitability)
/app/customers/:id/edit     → Edit Customer
/app/customers/groups       → Customer Groups
/app/customers/import       → CSV Import (customers)

/app/price-lists            → Price List Management
/app/price-lists/new        → Create Price List
/app/price-lists/:id        → Price List Detail + Entries

/app/sales                  → Sales Dashboard
/app/sales/quotes           → Quote List
/app/sales/quotes/new       → Create Quote
/app/sales/quotes/:id       → Quote Detail
/app/sales/quotes/:id/edit  → Edit Quote
/app/sales/orders           → Sales Order List
/app/sales/orders/new       → Create Sales Order
/app/sales/orders/:id       → Sales Order Detail
/app/sales/orders/:id/edit  → Edit Sales Order
/app/sales/orders/:id/fulfill → Fulfillment / Shipment Wizard
/app/sales/shipments        → All Shipments List
/app/sales/returns          → Return Authorizations (RMA) List
/app/sales/returns/new      → Create RMA
/app/sales/returns/:id      → RMA Detail

/app/invoices               → Invoice List
/app/invoices/new           → Create Invoice (manual)
/app/invoices/:id           → Invoice Detail
/app/invoices/:id/edit      → Edit Invoice (draft only)

/app/manufacturing          → Manufacturing Dashboard
/app/manufacturing/boms     → BOM List
/app/manufacturing/boms/new → Create BOM
/app/manufacturing/boms/:id → BOM Detail + Cost Builder
/app/manufacturing/boms/:id/edit → Edit BOM / Manage Versions
/app/manufacturing/work-orders → Work Order List
/app/manufacturing/work-orders/new → Create Work Order
/app/manufacturing/work-orders/:id → Work Order Detail
/app/manufacturing/work-orders/:id/execute → Record Consumption + Output

/app/costing                → Costing Dashboard (product costs, margins)

/app/expenses               → Expense List
/app/expenses/new           → Create Expense
/app/expenses/:id           → Expense Detail
/app/expenses/categories    → Expense Categories

/app/reports                → Reports Hub
/app/reports/inventory-valuation    → Inventory Valuation Report
/app/reports/inventory-movement     → Inventory Movement Report
/app/reports/lot-tracking           → Lot Traceability Report
/app/reports/product-profitability  → Product Profitability
/app/reports/customer-profitability → Customer Profitability
/app/reports/aged-receivables       → Aged Receivables
/app/reports/aged-payables          → Aged Payables
/app/reports/sales-tax              → Sales Tax Report
/app/reports/expense                → Expense Report
/app/reports/work-order-cost        → Work Order Cost Summary
/app/reports/purchase-history       → Purchase History by Vendor

/app/notifications          → Notification Feed (all)

/app/settings               → Settings Hub
/app/settings/organization  → Org Profile
/app/settings/users         → User Management
/app/settings/roles         → Role Descriptions (read-only in MVP)
/app/settings/uom           → UOM Management
/app/settings/billing       → Subscription & Billing (Owner only)
/app/settings/tax           → Tax Settings
/app/settings/accounts      → Chart of Accounts
/app/settings/imports       → Import History + Templates
/app/settings/audit         → Audit Log
/app/settings/profile       → My Profile (name, password, MFA)
/app/settings/notifications → My Notification Preferences
```

---

## Primary Navigation (Sidebar)

The sidebar is visible on all `/app/*` routes. Items shown/hidden by role.

```
┌─────────────────────────────┐
│  [Logo]  Org Name      [▾]  │  ← org switcher (phase 3)
├─────────────────────────────┤
│  🔍  Global Search          │
├─────────────────────────────┤
│  ◉  Dashboard               │
├─────────────────────────────┤
│  OPERATIONS                 │
│  📦  Products               │
│  📊  Inventory              │
│  🏭  Warehouses             │
├─────────────────────────────┤
│  BUYING                     │
│  🏢  Vendors                │
│  🛒  Purchasing             │
├─────────────────────────────┤
│  SELLING                    │
│  👥  Customers              │
│  💰  Price Lists            │
│  🧾  Sales                  │
│  📋  Invoices               │
├─────────────────────────────┤
│  PRODUCTION                 │
│  🔧  Manufacturing          │
│  📐  Costing                │
├─────────────────────────────┤
│  FINANCE                    │
│  💸  Expenses               │
│  📈  Reports                │
├─────────────────────────────┤
│  ⚙️  Settings               │
│  🔔  Notifications   [3]    │
└─────────────────────────────┘
```

---

## Mobile Navigation

On mobile (< 640px), sidebar collapses to a bottom tab bar for warehouse tasks:

```
┌──────────────────────────────────────┐
│  [🔍 Scan] [📦 Stock] [🛒 PO] [➕]  │
└──────────────────────────────────────┘
```

Full navigation accessible via hamburger menu.

---

## Onboarding Flow

```
/register
   │
   ▼
Email verification
   │
   ▼
/onboarding/1  (org profile)
   │
   ▼
/onboarding/2  (UOM selection)
   │
   ▼
/onboarding/3  (warehouse setup)
   │
   ▼
/onboarding/4  (tax settings)
   │
   ▼
/onboarding/5  (costing method — point of no return)
   │
   ▼
/onboarding/6  (chart of accounts)
   │
   ▼
/onboarding/7  (invite team — optional, can skip)
   │
   ▼
/app/dashboard  (🎉 welcome state)
```
