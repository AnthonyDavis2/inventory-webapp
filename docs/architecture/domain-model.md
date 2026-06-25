# Domain Model

Last updated: 2026-06-24

This document describes the core entities, their key attributes, and the relationships between them. It is the conceptual model — the Prisma schema is the authoritative implementation.

---

## Bounded Contexts

The system is divided into 8 bounded contexts. Each context owns its entities and communicates with other contexts through domain events only.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PLATFORM CONTEXT                                   │
│  Organizations · Users · Roles · Subscriptions · Onboarding · Audit Log    │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ (all contexts belong to an org)
     ┌─────────────────────────┼─────────────────────────────────┐
     │                         │                                 │
     ▼                         ▼                                 ▼
┌──────────────┐    ┌──────────────────────┐        ┌───────────────────────┐
│  CATALOG     │    │    INVENTORY         │        │   PROCUREMENT         │
│  Context     │◄───│    Context           │◄───────│   Context             │
│              │    │                      │        │                       │
│ Products     │    │ Inventory Ledger     │        │ Vendors               │
│ Variants     │    │ Cost Layers (FIFO)   │        │ Purchase Orders       │
│ Categories   │    │ Warehouses           │        │ Receipts              │
│ UOM          │    │ Bin Locations        │        │ Landed Costs          │
│ Barcodes     │    │ Lots / Serials       │        │ Reorder Rules         │
└──────┬───────┘    └──────────┬───────────┘        └───────────────────────┘
       │                       │
       ▼                       ▼
┌────────────────┐   ┌──────────────────────────────────────┐
│ MANUFACTURING  │   │         SALES CONTEXT                │
│ Context        │   │                                      │
│                │   │ Customers · Customer Groups          │
│ BOMs           │   │ Price Lists · Quotes                 │
│ BOM Versions   │   │ Sales Orders · Shipments             │
│ Work Orders    │   │ Invoices · Payments · Credit Memos   │
│ Cost Builder   │   │ Returns (RMA)                        │
└────────┬───────┘   └──────────────────────────────────────┘
         │
         ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│  COSTING         │   │  FINANCIALS      │   │  NOTIFICATIONS           │
│  Context         │   │  Context         │   │  Context                 │
│                  │   │                  │   │                          │
│ Standard Costs   │   │ Chart of Accts   │   │ Notification Records     │
│ Cost History     │   │ Journal Entries  │   │ User Preferences         │
│ Overhead Rules   │   │ Expenses         │   │ Email Delivery Log       │
│ Margin Reports   │   │ Tax Settings     │   │                          │
└──────────────────┘   └──────────────────┘   └──────────────────────────┘
```

---

## Core Entity Relationships

### Platform Context

```
Organization (1) ──────── (*) User
Organization (1) ──────── (1) OnboardingState
Organization (1) ──────── (1) Subscription
Organization (1) ──────── (*) AuditLogEntry
User (1) ──────────────── (1) Role [ENUM]
User (1) ──────────────── (*) Session
User (1) ──────────────── (*) MFASetup
User (1) ──────────────── (1) NotificationPreferences
```

### Catalog Context

```
Organization (1) ──── (*) UnitOfMeasure
Organization (1) ──── (*) UOMConversion
Organization (1) ──── (*) ProductCategory
ProductCategory (0..1) ─── (*) ProductCategory [self-referencing tree]
Organization (1) ──── (*) Product
Product (1) ──── (*) ProductVariant
Product (1) ──── (*) ProductBarcode
Product (1) ──── (*) ProductImage
Product (1) ──── (1) UnitOfMeasure [purchase_uom]
Product (1) ──── (1) UnitOfMeasure [stocking_uom]
Product (1) ──── (1) UnitOfMeasure [sales_uom]
Product (1) ──── (0..1) ProductCategory
```

### Inventory Context

```
Organization (1) ──── (*) Warehouse
Warehouse (1) ──── (*) BinLocation
Organization (1) ──── (*) InventoryLedgerEntry
InventoryLedgerEntry (*) ──── (1) Product
InventoryLedgerEntry (*) ──── (1) Warehouse
InventoryLedgerEntry (*) ──── (0..1) BinLocation
InventoryLedgerEntry (*) ──── (0..1) Lot
InventoryLedgerEntry (*) ──── (0..1) SerialNumber
Organization (1) ──── (*) FifoCostLayer         [FIFO orgs only]
FifoCostLayer (*) ──── (1) Product
FifoCostLayer (*) ──── (1) Warehouse
Organization (1) ──── (*) WeightedAverageCost   [WAC orgs only]
WeightedAverageCost (*) ──── (1) Product
WeightedAverageCost (*) ──── (1) Warehouse
Organization (1) ──── (*) Lot
Lot (*) ──── (1) Product
Organization (1) ──── (*) SerialNumber
SerialNumber (*) ──── (1) Product
Organization (1) ──── (*) ReorderRule
ReorderRule (*) ──── (1) Product
ReorderRule (*) ──── (1) Warehouse
```

### Procurement Context

```
Organization (1) ──── (*) Vendor
Vendor (1) ──── (*) VendorContact
Vendor (1) ──── (*) VendorPriceListEntry
VendorPriceListEntry (*) ──── (1) Product
Organization (1) ──── (*) PurchaseOrder
PurchaseOrder (*) ──── (1) Vendor
PurchaseOrder (1) ──── (*) PurchaseOrderLine
PurchaseOrderLine (*) ──── (1) Product
PurchaseOrder (1) ──── (*) Receipt
Receipt (1) ──── (*) ReceiptLine
ReceiptLine (*) ──── (1) PurchaseOrderLine
ReceiptLine (*) ──── (0..1) Lot
ReceiptLine (*) ──── (*) SerialNumber
Receipt (1) ──── (*) LandedCost
```

### Sales Context

```
Organization (1) ──── (*) Customer
Customer (1) ──── (*) CustomerContact
Customer (1) ──── (*) CustomerAddress
Customer (0..1) ──── (1) CustomerGroup
Organization (1) ──── (*) CustomerGroup
Organization (1) ──── (*) PriceList
PriceList (1) ──── (*) PriceListEntry
PriceListEntry (*) ──── (1) Product
Customer (*) ──── (1) PriceList [default_price_list]
Organization (1) ──── (*) Quote
Quote (*) ──── (1) Customer
Quote (1) ──── (*) QuoteLine
QuoteLine (*) ──── (1) Product
Quote (0..1) ──── (1) SalesOrder [converted_to]
Organization (1) ──── (*) SalesOrder
SalesOrder (*) ──── (1) Customer
SalesOrder (1) ──── (*) SalesOrderLine
SalesOrderLine (*) ──── (1) Product
SalesOrder (1) ──── (*) Shipment
Shipment (1) ──── (*) ShipmentLine
ShipmentLine (*) ──── (1) SalesOrderLine
Shipment (*) ──── (0..1) Lot
SalesOrder (1) ──── (*) Invoice
Invoice (1) ──── (*) InvoiceLine
InvoiceLine (*) ──── (1) SalesOrderLine
Invoice (1) ──── (*) Payment
Invoice (0..1) ──── (*) CreditMemo
Organization (1) ──── (*) ReturnAuthorization [RMA]
ReturnAuthorization (*) ──── (1) SalesOrder
ReturnAuthorization (1) ──── (*) ReturnLine
```

### Manufacturing Context

```
Organization (1) ──── (*) BillOfMaterials
BillOfMaterials (*) ──── (1) Product [finished_good]
BillOfMaterials (1) ──── (*) BOMVersion
BOMVersion (1) ──── (*) BOMLine
BOMLine (*) ──── (1) Product [component]
BOMLine (*) ──── (1) UnitOfMeasure
BOMLine (0..1) ──── (1) Product [substitute_component]
Organization (1) ──── (*) WorkOrder
WorkOrder (*) ──── (1) BOMVersion
WorkOrder (*) ──── (1) Product [finished_good]
WorkOrder (1) ──── (*) WorkOrderMaterialLine
WorkOrderMaterialLine (*) ──── (1) BOMLine
WorkOrder (1) ──── (*) WorkOrderLaborEntry
WorkOrder (1) ──── (*) WorkOrderScrapEntry
```

### Costing Context

```
Organization (1) ──── (1) OverheadAllocationRule
Organization (1) ──── (*) ProductStandardCost
ProductStandardCost (*) ──── (1) Product
ProductStandardCost (*) ──── (1) BOMVersion [source]
```

### Financials Context

```
Organization (1) ──── (*) ChartOfAccount
Organization (1) ──── (*) JournalEntry
JournalEntry (1) ──── (*) JournalEntryLine
JournalEntryLine (*) ──── (1) ChartOfAccount
Organization (1) ──── (*) Expense
Expense (*) ──── (1) ExpenseCategory
Organization (1) ──── (*) ExpenseCategory
Organization (1) ──── (1) TaxSettings
```

---

## Key Entity Descriptions

### InventoryLedgerEntry
The most critical entity in the system. Immutable once created. Every inventory movement — regardless of cause — creates one or more ledger entries. Current stock is always derived by summing these entries, never stored independently.

### FifoCostLayer
Tracks the cost of inventory received in a specific purchase. One layer per receipt line per product per warehouse. Layers have a `quantity_remaining` that decreases as inventory is consumed (outbound movements). When a layer reaches zero, it is fully consumed and the next oldest layer is used.

### BOMVersion
BOMs are versioned. Each version is a snapshot of the component list at a point in time. Work orders reference a specific version, so cost variances reflect the version active when the WO was created. Activating a new BOM version triggers a cost recalculation event.

### PriceList / PriceListEntry
Price lists contain rules, not just flat prices. A rule can be: flat price, markup multiplier over current cost, or discount % off list price. Resolution order on an order line: explicit line override → customer's assigned price list → org default price list.

### WorkOrder
Bridges manufacturing and inventory. Creating a WO does not move inventory. Releasing a WO reserves materials. Completing a WO posts all consumption and output ledger entries atomically. If completion fails (e.g. insufficient material), no ledger entries are written.

---

## Aggregate Roots

In DDD terms, these entities are aggregate roots — they control access to their child entities:

| Aggregate Root | Child Entities |
|---|---|
| Organization | Users, OnboardingState, Subscription, TaxSettings |
| Product | ProductVariants, ProductBarcodes, ProductImages |
| PurchaseOrder | PurchaseOrderLines, Receipts |
| SalesOrder | SalesOrderLines, Shipments |
| Invoice | InvoiceLines, Payments |
| BillOfMaterials | BOMVersions, BOMLines |
| WorkOrder | WorkOrderMaterialLines, WorkOrderLaborEntries, WorkOrderScrapEntries |
| InventoryLedgerEntry | (atomic — no children) |

---

## Invariants (Business Rules Enforced at Domain Level)

1. An `InventoryLedgerEntry` can never be updated or deleted after creation.
2. An organization's `costing_method` cannot change after any ledger entry exists.
3. A `WorkOrder` cannot be released if required materials are insufficient (below available quantity).
4. An `Invoice` cannot be voided after a payment has been applied; the payment must be reversed first.
5. A `BOMVersion` cannot be deactivated if it is referenced by any open `WorkOrder`.
6. A `Product` cannot be archived if it has non-zero inventory in any warehouse.
7. A `Warehouse` cannot be deactivated if it holds any non-zero inventory.
8. A `User` cannot be hard-deleted; only deactivated.
9. All monetary values are stored as integer cents. Fractional cents are rounded to the nearest cent at the application layer.
10. A `SalesOrderLine` quantity cannot be reduced below the already-shipped quantity.
