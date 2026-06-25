# Key Module Wireframes

Design notes: Sidebar-based layout. Content area is clean and spacious. Tables are minimal with row-hover actions. Detail pages use a two-column layout (main content + metadata sidebar). Sheets (slide-in panels) for create/edit — not page navigations.

---

## App Shell

```
┌────────┬───────────────────────────────────────────────────────────────┐
│        │                                                               │
│  [▣]   │  [Breadcrumb or Page Title]                  [Primary Action]│
│        ├───────────────────────────────────────────────────────────────┤
│  ───   │                                                               │
│        │                   CONTENT AREA                                │
│  ○ DB  │                   max-w-7xl mx-auto px-6 py-8                │
│        │                                                               │
│  OPER  │                                                               │
│  ○ Pr  │                                                               │
│  ○ Inv │                                                               │
│  ○ Wh  │                                                               │
│        │                                                               │
│  BUY   │                                                               │
│  ○ Ven │                                                               │
│  ○ PO  │                                                               │
│        │                                                               │
│  SELL  │                                                               │
│  ○ Cu  │                                                               │
│  ○ Sa  │                                                               │
│  ○ Inv │                                                               │
│        │                                                               │
│  MFG   │                                                               │
│  ○ Mfg │                                                               │
│  ○ Cos │                                                               │
│        │                                                               │
│  ○ Rep │                                                               │
│  ○ Exp │                                                               │
│  ───   │                                                               │
│  ○ Set │                                                               │
│  🔔 3  │                                                               │
│  [Av]  │                                                               │
└────────┴───────────────────────────────────────────────────────────────┘
 240px    remaining width

Sidebar:
  bg-gray-50 border-r border-gray-200
  Active item: bg-white text-indigo-600 font-medium border-r-2 border-indigo-600
  Inactive item: text-gray-600 hover:text-gray-900 hover:bg-gray-100
  Section labels: text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4

Top bar (inside content area):
  Breadcrumb: text-xs text-gray-400  >  text-gray-600  >  text-gray-900 font-medium
  Primary action: bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium
```

---

## Command Palette (⌘K)

```
      ┌──────────────────────────────────────────────────┐
      │  🔍  Search everything...                        │
      │                                                  │
      │  ────────────────────────────────────────────    │
      │  RECENT                                          │
      │  ○  SO-2026-00214   TechCo Solutions             │
      │  ○  INV-2026-00186  Invoice · $1,389.00          │
      │  ○  Widget A        Product · 1,240 in stock     │
      │  ────────────────────────────────────────────    │
      │  QUICK ACTIONS                                   │
      │  ⊕  New sales order              ⌘ N            │
      │  ⊕  New purchase order                          │
      │  ⊕  Record inventory adjustment                 │
      └──────────────────────────────────────────────────┘
      
      bg-white rounded-2xl border border-gray-200 shadow-xl
      max-w-lg w-full  centered in viewport
      Backdrop: bg-black/20
```

---

## Executive Dashboard

```
  Dashboard                                                Jun 2026  ▾
  ────────────────────────────────────────────────────────────────────

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  Revenue         │  │  Gross Profit    │  │  Net Profit      │
  │                  │  │                  │  │                  │
  │  $84,320         │  │  $31,200         │  │  $18,400         │
  │  text-2xl mono   │  │  text-2xl mono   │  │  text-2xl mono   │
  │                  │  │                  │  │                  │
  │  ▲ 12%  vs last  │  │  37.0%  margin   │  │  21.8%  margin   │
  │  green text-xs   │  │  text-xs gray    │  │  text-xs gray    │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
  border border-gray-200  rounded-xl  p-5  bg-white

  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  Inventory Value │  │  Open Orders     │  │  Overdue Inv.    │
  │  $142,800        │  │  23              │  │  4               │
  │  at cost         │  │  $48k value      │  │  $12,400         │
  │                  │  │                  │  │  ● red badge     │
  └──────────────────┘  └──────────────────┘  └──────────────────┘

  ┌───────────────────────────────────────┐  ┌──────────────────────┐
  │  Revenue  (last 30 days)              │  │  Top Products        │
  │                                       │  │  by revenue          │
  │        ·  ·                           │  │                      │
  │      ·      ·    ·                    │  │  Widget A   $18,400  │
  │    ·          ·    ·                  │  │  Widget B   $14,200  │
  │  ·              ·    ·                │  │  Comp X      $9,800  │
  │                    ·   ·   ·          │  │  Assy Y      $7,600  │
  │  ─────────────────────────────────    │  │  Raw Z       $6,400  │
  │  Jun 1                     Jun 24     │  │                      │
  │  Smooth line chart, no fills          │  │  text-sm font-mono   │
  └───────────────────────────────────────┘  └──────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  Recent Activity                                                 │
  │  ──────────────────────────────────────────────────────────────  │
  │  ● green  INV-2026-00184 paid  ·  Acme Corp  ·  $4,200    2h   │
  │  ● blue   PO-2026-00092 received  ·  500 units Widget A   3h   │
  │  ● yellow INV-2026-00171 overdue  ·  TechCo  ·  $1,800    4h   │
  │  ● purple WO-00041 completed  ·  200 × Widget B            5h  │
  │                                                 [View all →]    │
  └──────────────────────────────────────────────────────────────────┘
  Each row: text-sm  ·  dot matches status color  ·  timestamp text-gray-400
```

---

## Product List

```
  Products                            [Import]  [+ New Product]
  ─────────────────────────────────────────────────────────────

  🔍  Search products...                 Type ▾   Category ▾

  ┌──────────────────────────────────────────────────────────────────┐
  │  Product              SKU        Type       On Hand  Cost        │
  │  ──────────────────────────────────────────────────────────────  │
  │  Widget A             WGT-001    ● Finished  1,240   $2.50       │
  │  Widget B             WGT-002    ● Finished    840   $3.80       │
  │  Aluminum Rod         RAW-001    ● Raw Mat  2,400lb  $0.42/lb    │
  │  Packaging Box S      PKG-001    ● Supply      500   $0.15       │
  │  Sub-Assembly Unit    ASM-001    ● Component   320   $2.10       │
  └──────────────────────────────────────────────────────────────────┘
  
  Row hover: bg-gray-50  ·  Show [...] action menu on hover (right side)
  Type badges: colored pills (green=finished, blue=raw, gray=supply, purple=component)
  Cost column: font-mono text-right  ·  hidden for SALES_STAFF role
  
  Page 1 of 12  ·  289 products            [<  1  2  3 ... 12  >]
```

---

## Inventory Dashboard

```
  Inventory                              [Adjust]  [Transfer]  [Count]
  ─────────────────────────────────────────────────────────────────────

  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐
  │  Total Value │  │  SKUs        │  │  Low Stock   │  │  Expiring  │
  │  $142,800    │  │  289 active  │  │  12 items    │  │  Soon      │
  │              │  │              │  │  ● yellow    │  │  3 lots    │
  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘

  🔍  Search inventory...     Warehouse: All ▾     Status: All ▾

  ┌──────────────────────────────────────────────────────────────────┐
  │  Product          SKU       Warehouse  Available  Reserved  Cost  │
  │  ──────────────────────────────────────────────────────────────   │
  │  Widget A         WGT-001   Main       1,120 ea   120 ea  $2,800  │
  │  Widget B         WGT-002   Main         760 ea    80 ea  $2,888  │
  │  ⚠ Aluminum Rod   RAW-001   Main         480 lb     — lb    $202  │
  │    text-yellow-600 ← below reorder point                         │
  │  Packaging Box S  PKG-001   Main         500 ea     —       $75   │
  └──────────────────────────────────────────────────────────────────┘
  
  Valuation column: font-mono  ·  hidden for WAREHOUSE_STAFF
  ⚠ icon: text-yellow-500  ·  row bg: bg-yellow-50/30
```

---

## Purchase Order Detail

```
  ← Purchase Orders
  ─────────────────────────────────────────────────────────────────────
  PO-2026-00094                                              ⋯  [Receive →]
  
  ┌─────────────────────────────────────┐  ┌─────────────────────────┐
  │  Apex Supplies Inc                   │  │  Status                 │
  │  text-lg font-medium                 │  │  ● SENT                 │
  │  purchasing@apexsupplies.com         │  │  badge-blue             │
  │                                      │  │                         │
  │  Payment  Net 30                     │  │  Expected               │
  │  Created  Jun 18, 2026               │  │  Jul 2, 2026            │
  │  Sent     Jun 19, 2026               │  │                         │
  └─────────────────────────────────────┘  └─────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  ITEMS                                                           │
  │  ──────────────────────────────────────────────────────────────  │
  │  Product           Qty      UOM    Unit Cost   Total  Received   │
  │  ──────────────────────────────────────────────────────────────  │
  │  Aluminum Rod     5,000     lb       $0.38    $1,900   —         │
  │  Steel Bracket      200     ea       $1.20      $240   —         │
  │  Lubricant Oil       50     gal     $18.00      $900   —         │
  │  ──────────────────────────────────────────────────────────────  │
  │                                    Total      $3,040             │
  └──────────────────────────────────────────────────────────────────┘
  font-mono for all numbers  ·  right-aligned amounts

  RECEIPTS
  ─────────────────────────────────────────────────────────────────────
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │    No receipts yet.                                              │
  │    When goods arrive, click Receive to record them.             │
  │                                                                  │
  │                    [Receive goods →]                             │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
  Empty state: centered, icon-gray-200, text-gray-500
```

---

## Receiving — Slide-in Sheet

```
  Main page dims (bg-black/20)

  ┌───────────────────────────────────────────────────────────┐ ←
  │  Receive goods                                        ✕   │ slide
  │  PO-2026-00094  ·  Apex Supplies Inc                      │ in
  │  ──────────────────────────────────────────────────────   │ from
  │                                                           │ right
  │  Receipt date        Warehouse                            │
  │  [Jun 24, 2026 ▾]    [Main Warehouse ▾]                   │
  │                                                           │
  │  ──────────────────────────────────────────────────────   │
  │                                                           │
  │  Aluminum Rod   ordered 5,000 lb                          │
  │  Receiving  [5000    ] lb  ·  Cost [$0.38  ]              │
  │  Lot  [LOT-20260624-001  ]  Bin  [A1-01  ▾]               │
  │                                                           │
  │  ──────────────────────────────────────────────────────   │
  │  Steel Bracket   ordered 200 ea                           │
  │  Receiving  [ 200    ] ea  ·  Cost [$1.20  ]              │
  │                                                           │
  │  ──────────────────────────────────────────────────────   │
  │  Lubricant Oil   ordered 50 gal                           │
  │  Receiving  [  50    ] gal  ·  Cost [$18.00 ]             │
  │                                                           │
  │  ──────────────────────────────────────────────────────   │
  │  + Add landed cost (freight, duty, handling)              │
  │    text-indigo-600 text-sm                                │
  │                                                           │
  │  ──────────────────────────────────────────────────────   │
  │                                                           │
  │  [Save draft]              [Post receipt]                 │
  │  text-gray-600             bg-indigo-600 text-white       │
  │                                                           │
  │  Posting creates inventory ledger entries                 │
  │  and cannot be undone.  text-xs text-gray-400             │
  └───────────────────────────────────────────────────────────┘
  w-[480px] bg-white shadow-xl border-l border-gray-200
```

---

## Sales Order Detail

```
  ← Sales Orders
  ─────────────────────────────────────────────────────────────────────
  SO-2026-00214                                    [Fulfill →]  [Invoice]

  ┌─────────────────────────────────────┐  ┌─────────────────────────┐
  │  TechCo Solutions                   │  │  Status                 │
  │  456 Tech Way, Austin TX 78701      │  │  ● CONFIRMED            │
  │                                     │  │                         │
  │  Payment  Net 30                    │  │  Fulfillment            │
  │  Ordered  Jun 20, 2026              │  │  ◐ Partial              │
  │  Rep      Tom K.                    │  │  100/150 units          │
  └─────────────────────────────────────┘  └─────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  ITEMS                                                           │
  │  ──────────────────────────────────────────────────────────────  │
  │  Product     Qty  Unit Price  Disc  Tax      Total  Fulfilled    │
  │  ──────────────────────────────────────────────────────────────  │
  │  Widget A    100    $12.00    0%    8.25%  $1,299   ✓ 100/100   │
  │  Widget B     50    $18.00    0%    8.25%    $975   ◐  20/50    │
  │  ──────────────────────────────────────────────────────────────  │
  │                          Subtotal          $2,100               │
  │                          Tax (8.25%)         $173               │
  │                          Shipping             $45               │
  │                          Total             $2,318               │
  └──────────────────────────────────────────────────────────────────┘

  SHIPMENTS                                              [+ Shipment]
  ─────────────────────────────────────────────────────────────────────
  SHP-001  Jun 22  UPS · 1Z999AA10123456      Widget A · 100ea  ● Shipped
  SHP-002  Pending —                          Widget B ·  20ea  ○ Draft

  INVOICES                                               [+ Invoice]
  ─────────────────────────────────────────────────────────────────────
  INV-2026-00186   $1,389.00   ● SENT   Due Jul 22, 2026  [View]
```

---

## Invoice Detail

```
  ← Invoices
  ─────────────────────────────────────────────────────────────────────
  INV-2026-00186                         [Send reminder]  [Record payment]

  ┌─────────────────────────────────────┐  ┌─────────────────────────┐
  │  Bill to                            │  │  Status  ● SENT         │
  │  TechCo Solutions                   │  │                         │
  │  456 Tech Way, Austin TX 78701      │  │  Amount due             │
  │  billing@techco.com                 │  │  $1,389.00              │
  │                                     │  │  font-mono text-xl      │
  │  Issued   Jun 22, 2026              │  │                         │
  │  Due      Jul 22, 2026  (28 days)   │  │  [Pay online →]         │
  │  Terms    Net 30                    │  │  text-xs text-gray-500  │
  └─────────────────────────────────────┘  └─────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  Description             Qty    Price      Tax      Total        │
  │  ──────────────────────────────────────────────────────────────  │
  │  Widget A                100   $12.00    $99.00   $1,299.00      │
  │  Shipping                 —       —          —       $45.00      │
  │  ──────────────────────────────────────────────────────────────  │
  │                              Subtotal              $1,245.00     │
  │                              Tax                      $99.00     │
  │                              Shipping                 $45.00     │
  │                              ─────────────────────────────────   │
  │                              Total                 $1,389.00     │
  │                              Paid                     $0.00      │
  │                              Amount due            $1,389.00     │
  └──────────────────────────────────────────────────────────────────┘
  All amounts: font-mono text-right

  PAYMENTS
  ─────────────────────────────────────────────────────────────────────
  No payments recorded.
```

---

## BOM Detail + Cost Builder

```
  ← Manufacturing  /  BOMs
  ─────────────────────────────────────────────────────────────────────
  Widget A                               [New version]  [Work order →]
  Version 3  ● Active  ·  Activated Jun 10, 2026

  COMPONENTS                                              [+ Component]
  ┌──────────────────────────────────────────────────────────────────┐
  │  Component         Qty    UOM    Scrap   Unit Cost   Line Cost   │
  │  ──────────────────────────────────────────────────────────────  │
  │  Aluminum Rod      0.25   lb       2%      $0.42       $0.107    │
  │  Steel Bracket     1.00   ea       0%      $1.20       $1.200    │
  │  Packaging Box S   1.00   ea       0%      $0.15       $0.150    │
  │  Lubricant Oil     0.01   gal      0%     $18.00       $0.180    │
  └──────────────────────────────────────────────────────────────────┘
  font-mono for numbers  ·  hover row shows [Edit] [Remove] actions

  ┌──────────────────────────────────────────────────────────────────┐
  │  COST BUILDER                                bg-gray-50 p-5      │
  │  ──────────────────────────────────────────────────────────────  │
  │  Direct materials           $1.637                               │
  │  Direct labor               $0.450    0.15 hrs × $3.00/hr        │
  │  Overhead                   $0.409    25% of materials           │
  │  ──────────────────────────────────────────────────────────────  │
  │  Standard cost / unit       $2.496    font-semibold              │
  │                                                                  │
  │  List price                $12.000                               │
  │  Gross margin               $9.504   79.2%   ● green badge       │
  │                                                                  │
  │  vs. Version 2: ▲ +$0.042/unit (+1.7%)   ↑ Aluminum Rod price   │
  │  text-xs text-yellow-600                                         │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Work Order Detail

```
  ← Manufacturing  /  Work Orders
  ─────────────────────────────────────────────────────────────────────
  WO-2026-00041  ·  Widget A  ·  500 units        [Record]  [Complete →]
  
  ● IN PROGRESS  ·  BOM v3  ·  Main Warehouse  ·  Started Jun 23

  ┌──────────────────────────────────────┐  ┌───────────────────────┐
  │  MATERIALS                           │  │  OUTPUT               │
  │  ─────────────────────────────────   ��  │  ─────────────────    │
  │  Aluminum Rod  ✓ 127.6 / 127.6 lb   │  │  Planned   500 units  │
  │  Steel Bracket ✓ 500 / 500 ea       │  │  Produced  0          │
  │  Packaging Box ○ 0 / 500 ea         │  │  Scrapped  0          │
  │  Lubricant Oil ✓ 5.1 / 5.1 gal     │  │                       │
  │                                     │  │  Yield  —             │
  │  ✓ = text-green-600                 │  │                       │
  │  ○ = text-gray-400 (pending)        │  └───────────────────────┘
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────┐
  │  COST                                           bg-gray-50 p-4   │
  │  ──────────────────────────────────────────────────────────────  │
  │  Standard      $1,248.00      Actual    $1,246.70                │
  │  Variance      -$1.30  (-0.1%)     ● On track  text-green-600   │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Mobile — Warehouse Scan Screen

```
  ┌──────────────────────────────┐
  │  ← Receive  PO-2026-00094    │  bg-white
  │  Apex Supplies Inc           │  header h-14
  ├──────────────────────────────┤
  │                              │
  │  ┌────────────────────────┐  │
  │  │                        │  │
  │  │    CAMERA VIEWFINDER   │  │
  │  │                        │  │
  │  │  ┌──────────────────┐  │  │
  │  │  │   align barcode  │  │  │
  │  │  └──────────────────┘  │  │
  │  │                        │  │
  │  └────────────────────────┘  │
  │  rounded-xl overflow-hidden  │
  │                              │
  │  Or enter manually           │
  │  text-xs text-gray-400       │
  │  ┌──────────────────────┐    │
  │  │ barcode...           │    │
  │  └──────────────────────┘    │
  │                              │
  ├──────────────────────────────┤
  │  LAST SCANNED                │
  │  ─────────────────────────   │
  │  Aluminum Rod                │
  │  500 lb received             │
  │  Lot LOT-20260624-001        │
  │  ● text-green-600 text-sm    │
  ├──────────────────────────────┤
  │  [View All]   [Done ✓]       │  sticky bottom bar
  └──────────────────────────────┘
  
  Min tap target: 44×44px (all buttons)
  Text: text-base minimum (readable in warehouse light)
  High contrast: text-gray-950 on bg-white always
```

---

## Notification Drawer (slide from right)

```
  ┌───────────────────────────────────────┐
  │  Notifications                   ✕   │
  │  ─────────────────────────────────   │
  │  [All]  [Unread 3]                   │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │  ● Inventory low               │  │  ← unread: bg-indigo-50/30
  │  │  Aluminum Rod below reorder    │  │
  │  │  point in Main Warehouse       │  │
  │  │  12 minutes ago                │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │  ● Invoice overdue             │  │
  │  │  INV-2026-00171 · TechCo       │  │
  │  │  $1,800 · 3 days past due      │  │
  │  │  2 hours ago                   │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │  ┌────────────────────────────────┐  │  ← read: bg-white
  │  │  PO-2026-00092 received        │  │
  │  │  500 units Widget A · Main     │  │
  │  │  3 hours ago                   │  │
  │  └────────────────────────────────┘  │
  │                                      │
  │  [Mark all read]  text-indigo-600    │
  └───────────────────────────────────────┘
  w-[380px] bg-white shadow-xl border-l border-gray-200
```
