# Onboarding Wizard Wireframes

---

## Step Progress Bar (persistent across all steps)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ●───●───●───○───○───○───○                                            │
│   1   2   3   4   5   6   7                                            │
│  Org UOM  WH  Tax Cost CoA Team                                        │
│                                                                         │
│   Step 3 of 7 — Warehouse Setup                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1 — Organization Profile

```
┌─────────────────────────────────────────────────────────────┐
│  Let's set up your organization                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Company Name *                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Acme Manufacturing LLC                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Business Email *                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ hello@acmemfg.com                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Phone                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ (555) 000-0000                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Address Line 1                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 123 Industrial Blvd                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  City          State    ZIP                                 │
│  ┌──────────┐  ┌──────┐ ┌──────────┐                       │
│  │ Dallas   │  │  TX  │ │  75201   │                       │
│  └──────────┘  └──────┘ └──────────┘                       │
│                                                             │
│  Timezone                    Fiscal Year Start              │
│  ┌──────────────────────┐   ┌──────────────────────┐       │
│  │ America/Chicago   ▾  │   │ January (Month 1)  ▾ │       │
│  └──────────────────────┘   └──────────────────────┘       │
│                                                             │
│  Company Logo                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📎  Upload logo (PNG, JPG — max 5MB)              │   │
│  │      Used on invoices, POs, and packing slips      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                        [Continue →]                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 2 — Units of Measure

```
┌─────────────────────────────────────────────────────────────┐
│  Select your units of measure                               │
│  ─────────────────────────────────────────────────────────  │
│  Choose the units you'll use. You can add more later.       │
│                                                             │
│  WEIGHT                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ☑ lb (pound)    ☑ oz (ounce)   ☐ kg    ☐ g         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  VOLUME                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ☑ gal    ☑ fl oz    ☐ L    ☐ mL                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  COUNT / PACKAGING                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ☑ each    ☑ dozen    ☑ case    ☑ box    ☐ pallet   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  LENGTH                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ☐ ft    ☐ in    ☐ m    ☐ yd                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  + Add custom UOM                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Name: ________   Abbreviation: ___   Type: [▾]      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Default stocking UOM: [each ▾]                             │
│                                                             │
│  [← Back]                           [Continue →]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 3 — Warehouse Setup

```
┌─────────────────────────────────────────────────────────────┐
│  Set up your warehouse                                      │
│  ─────────────────────────────────────────────────────────  │
│  You need at least one warehouse to track inventory.        │
│                                                             │
│  Warehouse Name *                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Main Warehouse                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Warehouse Code *                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MAIN                                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Address (optional)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Same as organization address            [Copy ↑]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ☐ Enable bin locations                              │ │
│  │     Track inventory at aisle / rack / shelf level    │ │
│  │     (You can enable this later, but it can't be     │ │
│  │      disabled once inventory has been received)     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [← Back]                           [Continue →]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 4 — Tax Settings

```
┌─────────────────────────────────────────────────────────────┐
│  Configure tax collection                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ○ I don't collect sales tax                         │ │
│  │    (e.g. B2B wholesale with resale certificates)     │ │
│  │                                                      │ │
│  │  ● I collect sales tax                               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [if "I collect sales tax" selected:]                       │
│                                                             │
│  Tax Rate (default)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 8.25  %                                             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ℹ️  You can configure per-customer exemptions later.       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ℹ️  Tax API integration (TaxJar/Avalara) is          │ │
│  │     available in Phase 2. For now, set a default     │ │
│  │     rate and override per customer or order.         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [← Back]                           [Continue →]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 5 — Inventory Costing Method

```
┌─────────────────────────────────────────────────────────────┐
│  Choose your inventory costing method                       │
│  ─────────────────────────────────────────────────────────  │
│  ⚠️  This cannot be changed after your first inventory      │
│  transaction. Choose carefully.                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ● FIFO — First In, First Out              [Recommended│ │
│  │           for manufacturers]                          │ │
│  │                                                      │ │
│  │  Each purchase receipt creates a cost layer. When    │ │
│  │  you sell or consume inventory, the oldest (cheapest)│ │
│  │  cost layers are used first.                         │ │
│  │                                                      │ │
│  │  ✅ Most accurate COGS when material costs change    │ │
│  │  ✅ Required for lot-tracked, expiring products      │ │
│  │  ⚠️  More complex — tracks cost per receipt layer    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ○ Weighted Average Cost                              │ │
│  │                                                      │ │
│  │  All units of a product share one average cost that  │ │
│  │  updates each time you receive inventory.            │ │
│  │                                                      │ │
│  │  ✅ Simpler to understand                            │ │
│  │  ✅ Preferred for high-volume, commodity products    │ │
│  │  ⚠️  COGS smoothed out — doesn't reflect price spikes│ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [← Back]                           [Continue →]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 6 — Chart of Accounts

```
┌─────────────────────────────────────────────────────────────┐
│  Review your chart of accounts                              │
│  ─────────────────────────────────────────────────────────  │
│  Pre-populated with standard US small business accounts.    │
│  You can rename and add accounts — system accounts are      │
│  locked.                                                    │
│                                                             │
│  ASSETS                                ▾                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1000  Cash                           🔒              │ │
│  │  1100  Accounts Receivable            🔒              │ │
│  │  1200  Inventory Asset                🔒              │ │
│  │  1500  Fixed Assets                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  LIABILITIES                           ▾                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  2000  Accounts Payable               🔒              │ │
│  │  2100  Sales Tax Payable              🔒              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  REVENUE                               ▾                    │
│  COGS                                  ▾                    │
│  EXPENSES                              ▾                    │
│                                                             │
│  [+ Add Account]                                            │
│                                                             │
│  [← Back]                           [Continue →]            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 7 — Invite Team Members

```
┌─────────────────────────────────────────────────────────────┐
│  Invite your team  (optional)                               │
│  ─────────────────────────────────────────────────────────  │
│  Invitations are valid for 72 hours.                        │
│                                                             │
│  Email                              Role                    │
│  ┌─────────────────────────────┐  ┌──────────────────────┐  │
│  │ sarah@acmemfg.com           │  │ Warehouse Staff    ▾ │  │
│  └─────────────────────────────┘  └──────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────┐  ┌──────────────────────┐  │
│  │ tom@acmemfg.com             │  │ Sales Staff        ▾ │  │
│  └─────────────────────────────┘  └──────────────────────┘  │
│                                                             │
│  [+ Add another]                                            │
│                                                             │
│  [← Back]          [Skip for now]     [Finish Setup ✓]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Onboarding Complete

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                       🎉                                    │
│              You're all set up!                             │
│                                                             │
│   Your 14-day free trial is active. No credit card         │
│   needed until your trial ends on Jul 8, 2026.             │
│                                                             │
│   ────────────────────────────────────────────────────      │
│   What would you like to do first?                          │
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────────┐   │
│   │  📦 Add products     │  │  📥 Import from CSV      │   │
│   └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│   ┌──────────────────────┐  ┌──────────────────────────┐   │
│   │  🏢 Add vendors      │  │  👥 Add customers         │   │
│   └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│                 [Go to Dashboard →]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
