# MVP Scope — Confirmed Feature List

Version: 1.0 | Last updated: 2026-06-24

This is the authoritative checklist of what ships in MVP v1.0 and what is explicitly deferred. When scope creep is detected, flag it against this list before implementing.

---

## ✅ In Scope — MVP v1.0

### Foundation & Platform
- [x] Multi-tenant architecture with PostgreSQL Row-Level Security
- [x] JWT authentication (access + refresh tokens, HttpOnly cookie)
- [x] TOTP multi-factor authentication (otplib)
- [x] Session management (list + revoke active sessions)
- [x] Organization onboarding wizard (all 7 steps — see below)
- [x] User management (invite, deactivate, roles)
- [x] Role-based access control (8 fixed roles — Owner, Admin, Manager, Accountant, Purchasing Staff, Warehouse Staff, Production Staff, Sales Staff, Viewer)
- [x] Stripe subscription management (Starter / Growth / Business plans)
- [x] 14-day free trial (no credit card required)
- [x] Plan limit enforcement (users, products, warehouses)
- [x] Stripe-hosted customer billing portal
- [x] Failed payment dunning (retry Day 1 / 3 / 7 → read-only suspension)
- [x] Email delivery via Resend (transactional only)
- [x] Sentry error tracking (frontend + backend)
- [x] Structured logging (Pino)
- [x] Health check endpoints (`/health`, `/health/detailed`)

### Onboarding Wizard (7 Steps)
- [x] Step 1: Organization profile (name, address, logo, timezone, fiscal year)
- [x] Step 2: Units of measure (select from global library, add custom)
- [x] Step 3: Warehouse setup (at least one required)
- [x] Step 4: Tax settings (manual tax rate for MVP)
- [x] Step 5: Inventory costing method (FIFO or Weighted Average — locked after first transaction)
- [x] Step 6: Chart of accounts (pre-populated US accounts, customizable)
- [x] Step 7: Invite team members (optional)

### Products & Catalog
- [x] Product catalog (create, edit, archive products)
- [x] Product categories and subcategories
- [x] Product variants (size, color, etc.)
- [x] Product types: raw material, component, supply, WIP, finished good
- [x] Units of measure system (global library + custom UOMs per org)
- [x] UOM conversion ratios (purchase → stocking, stocking → sales)
- [x] Per-product UOM assignment (purchase UOM, stocking UOM, sales UOM)
- [x] Barcode support (UPC, EAN, Code 128, QR — store multiple per product)
- [x] Camera-based barcode scanning (ZXing-js, browser only)
- [x] Internal barcode generation (for products without manufacturer barcodes)
- [x] Product images (upload, thumbnail generation, stored in R2)

### Inventory
- [x] Inventory ledger (immutable, append-only — source of truth)
- [x] All 14 movement types (PURCHASE_RECEIPT, SALES_SHIPMENT, PRODUCTION_CONSUMPTION, etc.)
- [x] FIFO costing (cost layers per SKU per warehouse)
- [x] Weighted average costing (running average per SKU per warehouse)
- [x] Warehouse management (multiple warehouses per org)
- [x] Bin location management (aisle-rack-shelf format)
- [x] Inventory tracked at warehouse + bin level
- [x] Lot / batch tracking (with expiration dates)
- [x] Serial number tracking
- [x] Inventory statuses (Available, Reserved, On Order, In Production, Quarantine, Damaged, Expired)
- [x] Inventory adjustments (with reason code, approver if configured)
- [x] Cycle counts
- [x] Warehouse-to-warehouse transfers
- [x] Bin-to-bin transfers
- [x] Reorder point per product per warehouse
- [x] Reorder quantity and safety stock
- [x] Purchase recommendation report (products below reorder point)

### Purchasing
- [x] Vendor profiles (name, address, contacts, payment terms, lead time)
- [x] Vendor price lists (per product, with effective dates)
- [x] Vendor performance tracking (on-time delivery, fill rate)
- [x] Purchase orders (create, edit, approve, send PDF via email)
- [x] PO approval workflow (configurable dollar threshold)
- [x] PO statuses (Draft → Sent → Partially Received → Fully Received → Closed → Cancelled)
- [x] Receiving (full and partial, assign lot/serial/warehouse/bin)
- [x] Landed costs on receipt (freight, duty, handling)
- [x] Inventory ledger entries generated on posting receipt
- [x] Receiving labels (PDF)

### Customers
- [x] Customer profiles (company, billing/shipping addresses, multiple contacts)
- [x] Customer types (retail, wholesale, direct, internal)
- [x] Customer groups (for reporting and price list assignment)
- [x] Credit limit and outstanding balance tracking
- [x] Tax exemption status (certificate number + expiration date)
- [x] Customer profitability (revenue, COGS, gross profit, margin %)

### Sales
- [x] Quotes (create, send PDF via email, convert to sales order)
- [x] Sales orders (line items, inventory reservation, fulfillment tracking)
- [x] Multiple shipments per order (partial fulfillment)
- [x] Backorder management (unfulfilled qty stays open)
- [x] Packing slip PDF generation
- [x] Manual shipping: record carrier, tracking number, actual shipping cost
- [x] Invoicing (auto-generate from shipped order or manual)
- [x] Invoice PDF generation (branded with org logo)
- [x] Invoice email to customer (via Resend)
- [x] Invoice statuses (Draft → Sent → Partially Paid → Paid → Overdue → Void)
- [x] Manual payment recording (check, ACH, wire, cash)
- [x] Stripe payment link on invoice (customer pays online)
- [x] Stripe webhook → auto-mark invoice as paid
- [x] Partial payments and payment plans
- [x] Credit memos (for returns and adjustments)
- [x] Return authorizations (RMA) with condition assessment
- [x] Returned goods back into inventory (restock or write-off)

### Pricing Engine
- [x] Multiple price lists per org (default, wholesale, customer-specific)
- [x] Flat price, markup over cost, discount off list
- [x] Customer price list assignment
- [x] Order-level and line-level price override (with permission)
- [x] Minimum margin floor (warn or block if below cost + min margin %)
- [x] Display margin impact on price override

### Manufacturing
- [x] Bills of Materials (single-level and multi-level)
- [x] BOM versioning (track changes, activate/deactivate versions)
- [x] BOM line fields (component, qty, UOM, scrap %, substitute, notes)
- [x] BOM cost builder (material + labor + overhead = standard cost per unit)
- [x] Overhead allocation methods (% of material cost, per unit, per labor hour)
- [x] Auto-recalculate BOM cost when component costs change
- [x] Work orders (Draft → Released → In Progress → Completed → Closed)
- [x] Material availability check before releasing work order
- [x] Actual vs. planned material consumption recording
- [x] Actual vs. planned output recording (yield variance)
- [x] Labor hours recording per work order
- [x] On completion: consume materials + add finished goods to inventory (ledger entries)
- [x] Scrap recording (qty, reason code, disposition)
- [x] Basic QC (pass/fail check on completion, defect recording)
- [x] Cost variance report (actual vs. standard per work order)

### Costing & Margins
- [x] Product cost tracking (FIFO layers or weighted average)
- [x] BOM standard cost calculation (multi-level rollup)
- [x] Gross margin per product (standard cost vs. selling price)
- [x] Gross profit per sales order line (cost at time of sale vs. revenue)
- [x] Gross margin per customer (period)
- [x] Cost history display per product

### Document Generation (PDF)
- [x] Purchase Orders
- [x] Receiving Documents
- [x] Sales Quotes
- [x] Sales Orders
- [x] Packing Slips
- [x] Invoices
- [x] Credit Memos
- [x] Work Orders
- [x] Inventory Count Sheets
- [x] Org-branded (logo, name, address, custom header/footer)
- [x] Configurable document number sequences per org (e.g. INV-2024-00001)

### Expenses
- [x] Expense categories (rent, utilities, payroll, insurance, marketing, etc.)
- [x] One-time and recurring expenses
- [x] Expense attachments (receipts, invoices — stored in R2)
- [x] Overhead pool allocation for product costing

### Accounting Readiness
- [x] Chart of accounts (pre-populated US small business accounts)
- [x] Journal entry mapping for all business events
- [x] Transaction export to CSV (manual import to QuickBooks/Xero)

### Reporting & Dashboards
- [x] Executive dashboard (revenue, COGS, gross profit, inventory value, open orders, overdue invoices, top 5 products/customers)
- [x] Inventory dashboard (valuation, turnover, dead stock, slow/fast movers, reorder suggestions, expiring lots)
- [x] Manufacturing dashboard (work orders, output, yield rate, scrap, cost variance)
- [x] Sales dashboard (revenue trend, orders, top products/customers, avg order value, quote conversion)
- [x] Purchasing dashboard (open POs, overdue POs, top vendors, purchase price variance)
- [x] Downloadable reports (CSV): Inventory Valuation, Inventory Movement, Lot Tracking, Product Profitability, Customer Profitability, Sales Tax, Expense, Work Order Cost, Purchase History, Aged Receivables, Aged Payables

### Notifications
- [x] In-app notification bell (unread count, notification feed)
- [x] Email notifications (per-user opt-in per notification type)
- [x] Notification polling for MVP (SSE/WebSocket is Phase 2)
- [x] All 10 notification triggers (low inventory, expiring lots, overdue PO, overdue invoice, work order delay, cost threshold, new user, payment failed, import complete, subscription payment failed)

### Data Import
- [x] CSV import for: products, raw materials/components, vendors, customers, opening inventory balances
- [x] Import pipeline: upload → validate → preview (with error highlighting) → confirm → process
- [x] Background job processing (never block HTTP request)
- [x] Partial import (write valid rows, flag invalid)
- [x] Error report (downloadable CSV)
- [x] Idempotent imports (external_id / row hash, no duplicate creation)
- [x] Import rollback within 24 hours (soft-delete via import_batch_id)
- [x] Downloadable CSV templates for each entity

### Audit & Compliance
- [x] Audit log (append-only, every create/update/delete action)
- [x] Soft deletes on all business-critical records
- [x] Audit log queryable by user, entity, date range, action
- [x] Audit log exportable to CSV
- [x] Visible to Owner and Admin in-app

### Security
- [x] Rate limiting (100 req/min per user, 1000/min per org via Redis)
- [x] Helmet.js security headers
- [x] Input validation (class-validator, whitelist, forbidNonWhitelisted)
- [x] CORS (whitelist known origins)
- [x] Password policy (12 chars, complexity, bcrypt cost 12, last 5 history, HaveIBeenPwned check)
- [x] File upload security (MIME validation, size limits, UUID filenames)
- [x] Pre-signed URLs for all file access (never direct bucket URLs)

---

## ❌ Out of Scope — Deferred to Phase 2

| Feature | Phase |
|---|---|
| TaxJar / Avalara API integration (manual rate is MVP) | Phase 2 |
| EasyPost / ShipStation shipping integration (manual tracking is MVP) | Phase 2 |
| QuickBooks / Xero live API sync (CSV export is MVP) | Phase 2 |
| Custom RBAC permission matrix (fixed roles are MVP) | Phase 2 |
| Offline mode (IndexedDB + service worker) | Phase 2 |
| Meilisearch (pg_trgm is MVP) | Phase 2 |
| Demand forecasting | Phase 2 |
| Automated reorder PO creation | Phase 2 |
| Three-way match (PO → Receipt → Vendor Invoice) | Phase 2 |
| Customer portal (self-service invoice view + payment) | Phase 2 |
| Outbound webhooks / event API | Phase 2 |
| ZPL barcode label printing | Phase 2 |
| Real-time notifications (SSE / WebSocket) | Phase 2 |
| Advanced price list rules (quantity breaks, date-effective) | Phase 2 |
| Advanced reporting / custom report builder | Phase 2 |
| Bills of Lading (full) | Phase 2 |

## ❌ Out of Scope — Deferred to Phase 3

| Feature | Phase |
|---|---|
| Multi-currency support | Phase 3 |
| Multi-language / i18n | Phase 3 |
| Marketplace integrations (Shopify, Amazon, WooCommerce) | Phase 3 |
| EDI support | Phase 3 |
| Advanced manufacturing (routings, work centers, capacity planning) | Phase 3 |
| Native mobile app | Phase 3 |
| SOC 2 Type II certification | Phase 3 |
| Enterprise SSO (SAML / OIDC) | Phase 3 |
| Multi-location inventory optimization | Phase 3 |
