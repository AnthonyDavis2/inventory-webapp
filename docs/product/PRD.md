# Product Requirements Document

**Product:** Business Operations Platform  
**Version:** 1.0 (MVP)  
**Last updated:** 2026-06-24  
**Status:** Draft

---

## 1. Executive Summary

A multi-tenant SaaS platform that gives small US-based manufacturers, wholesalers, and retailers a single system for inventory, manufacturing, purchasing, sales, costing, and business analytics. Targets businesses currently managing operations across disconnected spreadsheets, legacy desktop software, or inadequate SaaS tools.

**The core value proposition:** One system, real numbers. Know exactly what you have, what it costs, and whether you're making money — without stitching data together from five different places.

---

## 2. Problem Statement

Small manufacturers, wholesalers, and retailers share a common operational problem:

- Inventory lives in spreadsheets or a disconnected system that doesn't talk to sales
- Cost of goods sold is estimated, not calculated from actual purchase costs
- Profitability per product or customer is unknown until the accountant runs a quarterly report
- Manufacturing teams don't know if materials are available before starting a production run
- Purchasing is reactive — orders are placed when stock runs out, not when it hits a reorder point
- Onboarding a new ERP (QuickBooks, NetSuite, SAP) is either too expensive, too complex, or not built for their industry

**Target pain points by business type:**

| Business Type | Primary Pain |
|---|---|
| Small manufacturer | Can't calculate accurate unit costs; no production tracking |
| Wholesaler / distributor | Inventory accuracy, reorder management, vendor management |
| Retailer with inventory | Profitability per product and per customer is opaque |

---

## 3. Target Users

### Business Owner / Operator
- Wants executive-level visibility: revenue, COGS, margins, inventory value
- Non-technical; needs a clean dashboard, not a data dump
- Makes pricing and purchasing decisions based on what the platform tells them

### Warehouse Manager / Staff
- Primary interaction: receiving, picking, cycle counts, barcode scanning
- Needs large tap targets, fast scanning workflows, high contrast UI
- Works on mobile browser in warehouse conditions

### Purchasing Manager
- Creates and tracks POs, manages vendor relationships, monitors reorder points
- Needs vendor performance data and purchase recommendations to act proactively

### Sales / Account Manager
- Creates quotes and orders, tracks fulfillment, sends invoices
- Must not see unit cost or margin data (configured by role)

### Production Manager / Staff
- Creates and manages work orders, records material consumption and output
- Needs to see BOM cost builder and cost variances per work order

### Accountant
- Needs financial data, expense tracking, invoice management, report exports
- Does not need to edit inventory or production data

---

## 4. Product Vision

Become the operational backbone for 10,000 small US manufacturers, wholesalers, and retailers within 3 years. The platform replaces spreadsheets and fragmented tools for businesses with 1–50 employees, scaling from a solo operator to a multi-location operation without requiring a migration to a new system.

---

## 5. Success Metrics (MVP)

| Metric | Target |
|---|---|
| Onboarding completion rate | > 70% of signups complete all 7 steps |
| Time to first inventory transaction | < 30 minutes after onboarding |
| Monthly churn rate | < 3% |
| Trial to paid conversion | > 25% |
| NPS score (60 days post-activation) | > 40 |
| P99 API response time | < 2 seconds |
| Uptime | 99.9% |

---

## 6. Functional Requirements

### 6.1 Authentication & Security

**FR-AUTH-001:** Users authenticate with email + password. Password minimum 12 characters, must include uppercase, lowercase, number, special character.

**FR-AUTH-002:** JWT access tokens (15-min expiry) + refresh tokens (30-day expiry, HttpOnly cookie). Refresh token rotation on every use.

**FR-AUTH-003:** TOTP multi-factor authentication via authenticator app. Required for Owner and Admin roles.

**FR-AUTH-004:** Password breach check via HaveIBeenPwned API on password set or change.

**FR-AUTH-005:** Active session management: list all sessions, revoke individual sessions.

**FR-AUTH-006:** Rate limiting: 100 requests/minute per user, 1000/minute per org.

---

### 6.2 Multi-Tenancy

**FR-TENANT-001:** Every organization is a fully isolated tenant. No cross-tenant data access is permitted under any circumstances.

**FR-TENANT-002:** Tenant isolation enforced at two layers: PostgreSQL Row-Level Security policies + application-level `orgId` on every query.

**FR-TENANT-003:** `orgId` is always derived from the authenticated JWT. It is never accepted from the request URL, query string, or body.

---

### 6.3 Onboarding

**FR-ONBOARD-001:** A new organization cannot access any operational module until all mandatory onboarding steps are complete.

**FR-ONBOARD-002:** Onboarding wizard: 7 sequential steps (org profile → UOM → warehouse → tax settings → costing method → chart of accounts → invite team).

**FR-ONBOARD-003:** Incomplete onboarding shows a persistent banner with remaining steps.

**FR-ONBOARD-004:** Costing method is locked after the first inventory ledger entry is posted.

---

### 6.4 Units of Measure

**FR-UOM-001:** Global UOM library pre-seeded (each, oz, lb, kg, g, ml, L, fl oz, ft, m, box, case, pallet, roll, dozen, etc.).

**FR-UOM-002:** Organizations can add custom UOMs.

**FR-UOM-003:** UOM conversion ratios stored bidirectionally (`from_uom_id`, `to_uom_id`, `conversion_factor`).

**FR-UOM-004:** Each product has three UOM assignments: purchase UOM, stocking UOM, sales UOM. These may differ with a defined conversion.

**FR-UOM-005:** BOM lines carry their own UOM independently. System converts to stocking UOM for ledger entries.

**FR-UOM-006:** All inventory ledger entries are in stocking UOM. Mixed UOMs per product in the ledger are not permitted.

---

### 6.5 Products

**FR-PROD-001:** Products have: SKU (unique per org), name, description, type (raw material / component / supply / WIP / finished good), category, UOM assignments, images, barcodes.

**FR-PROD-002:** Products support variants (e.g. size, color). Each variant is a separate inventory-tracked entity with its own SKU.

**FR-PROD-003:** Products support multiple barcodes (UPC, EAN, Code 128, QR). Internal barcode generation for products without manufacturer barcodes.

**FR-PROD-004:** Barcode scanning via device camera (ZXing-js, browser-based, no native app required).

**FR-PROD-005:** Products can be soft-deleted. Hard deletion is not permitted.

---

### 6.6 Inventory Ledger

**FR-INV-001:** The inventory ledger is the sole source of truth for all inventory quantities. There are no mutable quantity fields.

**FR-INV-002:** Ledger entries are immutable. Corrections require a reversal entry + new correct entry, both referencing the original entry ID.

**FR-INV-003:** Every ledger entry must have a `reference_type` and `reference_id` linking it to a business document.

**FR-INV-004:** All 14 movement types are supported (see CONSTITUTION §6.6).

**FR-INV-005:** Current stock = `SUM(quantity) WHERE product_id = X AND warehouse_id = Y AND deleted_at IS NULL`.

**FR-INV-006:** Support point-in-time inventory snapshots: balance at any historical date.

**FR-INV-007:** Manual adjustments require a reason code and (if configured) an approver.

---

### 6.7 Inventory Costing

**FR-COST-001 (FIFO):** Each receipt creates a cost layer. Outbound movements consume from the oldest layer first. Cost is locked at time of ledger entry.

**FR-COST-002 (WAC):** Weighted average cost recalculated on each receipt: `new_avg = (existing_qty × existing_avg + received_qty × received_cost) / (existing_qty + received_qty)`.

**FR-COST-003:** Every outbound ledger entry carries `unit_cost_cents` and `total_cost_cents`, calculated and locked at write time.

**FR-COST-004:** Costing method cannot be changed after the first inventory transaction.

---

### 6.8 Warehouses & Locations

**FR-WH-001:** Multiple warehouses per organization.

**FR-WH-002:** Optional bin locations within warehouses (aisle-rack-shelf format, e.g. A1-02-03).

**FR-WH-003:** Inventory tracked at warehouse + bin level in the ledger.

**FR-WH-004:** Warehouse-to-warehouse and bin-to-bin transfers generate ledger entries.

---

### 6.9 Lot / Batch / Serial Tracking

**FR-LOT-001:** Lot tracking: group of units with shared origin. Lot numbers assigned on receipt.

**FR-LOT-002:** Expiration dates per lot with configurable alert threshold (30/60/90 days).

**FR-LOT-003:** Serial number tracking: individual unit identity.

**FR-LOT-004:** All outbound movements must specify lot/serial where the product requires it.

**FR-LOT-005:** FEFO (First Expired First Out) enforcement for expiring products.

---

### 6.10 Purchasing

**FR-PO-001:** Purchase orders created from: manual entry, purchase recommendation, or reorder point trigger.

**FR-PO-002:** PO approval workflow configurable by dollar threshold.

**FR-PO-003:** PO PDF generated and emailed to vendor via Resend.

**FR-PO-004:** PO statuses: Draft → Sent → Partially Received → Fully Received → Closed → Cancelled.

**FR-PO-005:** Partial receiving supported. Multiple receipts per PO.

**FR-PO-006:** Receiving: record lot/serial, assign warehouse/bin, record landed costs (freight, duty, handling).

**FR-PO-007:** Inventory ledger entries generated when receipt is posted (not on draft).

---

### 6.11 Customers & Sales

**FR-SALES-001:** Sales flow: Quote → Sales Order → Fulfillment → Invoice → Payment. Each step is optional.

**FR-SALES-002:** Quotes have expiration dates. Convert to sales order with one action.

**FR-SALES-003:** Inventory is reserved (status = Reserved) on sales order confirmation.

**FR-SALES-004:** Multiple shipments per order (partial fulfillment). Backorders remain open.

**FR-SALES-005:** MVP shipping: record carrier, tracking number, and actual shipping cost manually. No carrier API integration.

**FR-SALES-006:** Invoice auto-generated from shipped order or created manually.

**FR-SALES-007:** Stripe payment link on invoice. Stripe webhook auto-marks invoice as paid.

**FR-SALES-008:** Return authorizations (RMA) with condition assessment. Returned goods restocked or written off.

---

### 6.12 Pricing Engine

**FR-PRICE-001:** Multiple price lists per org. Lookup order: line override → customer price list → default price list.

**FR-PRICE-002:** Price list rules: flat price, markup over cost, discount off list.

**FR-PRICE-003:** Minimum margin floor: warn or block if selling below cost + minimum margin %.

**FR-PRICE-004:** Display margin impact when price is overridden on an order line.

---

### 6.13 Manufacturing

**FR-MFG-001:** Bills of Materials: single-level and multi-level. Versioned.

**FR-MFG-002:** BOM cost builder: material cost + direct labor + overhead = standard cost per unit. Auto-recalculates when component costs change.

**FR-MFG-003:** Overhead allocation methods: % of material cost, per unit produced, per labor hour.

**FR-MFG-004:** Work orders: material availability check before release. Track actual consumption vs. planned.

**FR-MFG-005:** On work order completion: consume materials (ledger entries) + add finished goods (ledger entry).

**FR-MFG-006:** Scrap recording with reason code. Yield variance tracked (actual output / planned output).

**FR-MFG-007:** Cost variance report per work order (actual vs. standard).

---

### 6.14 Reporting

**FR-RPT-001:** 5 real-time dashboards: Executive, Inventory, Manufacturing, Sales, Purchasing.

**FR-RPT-002:** All reports exportable to CSV.

**FR-RPT-003:** Key reports: Inventory Valuation (point-in-time), Lot Tracking (full traceability), Product Profitability, Customer Profitability, Aged Receivables, Aged Payables.

---

### 6.15 Notifications

**FR-NOTIF-001:** In-app notification bell with unread count and notification feed.

**FR-NOTIF-002:** Email notifications configurable per user per notification type.

**FR-NOTIF-003:** Critical notifications (subscription payment failed) ignore user preferences and always send.

**FR-NOTIF-004:** 10 notification triggers defined (see MVP-SCOPE.md).

---

### 6.16 Data Import

**FR-IMPORT-001:** CSV import for products, components, vendors, customers, opening inventory.

**FR-IMPORT-002:** Pipeline: upload → validate → preview → confirm → background processing.

**FR-IMPORT-003:** Import is idempotent. Re-uploading the same file does not create duplicates.

**FR-IMPORT-004:** Import can be rolled back within 24 hours.

---

### 6.17 Subscriptions & Billing

**FR-BILLING-001:** Three plans: Starter ($49/mo, 2 users, 500 products, 1 warehouse), Growth ($129/mo, 10 users, 5k products, 3 warehouses), Business ($299/mo, 25 users, unlimited products, 10 warehouses).

**FR-BILLING-002:** Annual plans: 2 months free (~16% discount).

**FR-BILLING-003:** 14-day free trial with full Business plan access, no credit card required.

**FR-BILLING-004:** On trial expiry or payment failure > 7 days: read-only mode enforced at API layer.

**FR-BILLING-005:** Plan limit enforcement before creating users, products, warehouses. Clear upgrade prompt when limit reached.

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time (p99) | < 2 seconds |
| Database query time | < 500ms (alert threshold) |
| Uptime | 99.9% (< 8.7 hours/year downtime) |
| Concurrent users | 50 per org, 500 total (MVP) |
| Data retention — financial records | Indefinite |
| Data retention — audit logs | 7 years minimum |
| TLS | 1.2+ enforced on all connections |
| WCAG accessibility | 2.1 AA minimum |
| Mobile responsiveness | < 640px, 640–1024px, > 1024px breakpoints |
| Tenant isolation | Zero cross-tenant data leakage tolerance |

---

## 8. Constraints

- **Solo developer:** Every architectural and implementation decision must be achievable and maintainable by one person.
- **US market only (MVP):** Single currency (USD), single language (en-US), US tax rules only.
- **No native app (MVP):** Mobile support via responsive web app and camera-based barcode scanning in browser.
- **Modular monolith:** One deployable backend unit. No microservices in MVP.
- **Money is integers:** All monetary values stored as `BIGINT` cents. Never floating point.

---

## 9. Assumptions

- All tenants operate in USD for MVP.
- All tenants are US-based (nexus, tax rules, date formats).
- Internet connectivity is required (no offline mode in MVP).
- Users bring their own Stripe account for payment processing is NOT the model — the platform charges subscriptions; customer payments via Stripe are processed on the platform's Stripe account.

---

## 10. Open Questions

*None at this time. All requirements are resolved. Flag new questions here as they arise during development.*
