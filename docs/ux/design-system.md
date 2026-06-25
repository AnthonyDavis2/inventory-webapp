# Design System

Last updated: 2026-06-24

The visual language for the platform. Built on Nuxt UI + Tailwind CSS. Inspired by the restraint of Linear, the clarity of Stripe Dashboard, and the density of Vercel.

---

## Design Principles

1. **Calm data density** — Show the right information at the right time. No noise, no empty padding for padding's sake.
2. **Obvious actions** — The primary action on any screen is always visually dominant. Secondary actions recede.
3. **Trust through precision** — Financial and inventory data is never approximated. Numbers are formatted consistently and unambiguously.
4. **Fast by default** — Optimistic UI, skeleton loaders, debounced search. The app feels instant.
5. **Works in a warehouse** — High contrast text, large tap targets (≥ 44px), readable in bright light and at arm's length.

---

## Color Palette (Tailwind tokens)

```
Background layers:
  bg-white              Page background
  bg-gray-50            Sidebar, secondary panels
  bg-gray-100           Hover state, subtle dividers

Text:
  text-gray-950         Primary text (headings, values)
  text-gray-600         Secondary text (labels, metadata)
  text-gray-400         Placeholder, disabled, captions

Borders:
  border-gray-200       Default border (cards, inputs, tables)
  border-gray-300       Focused / hover border

Accent (brand):
  bg-indigo-600         Primary buttons, active nav, links
  text-indigo-600       Inline links
  bg-indigo-50          Selected rows, active states

Status colors:
  green   (bg-green-50 / text-green-700 / border-green-200)    Active, paid, completed, in stock
  yellow  (bg-yellow-50 / text-yellow-700 / border-yellow-200) Warning, pending, draft, low stock
  red     (bg-red-50 / text-red-700 / border-red-200)          Error, overdue, cancelled, critical
  blue    (bg-blue-50 / text-blue-700 / border-blue-200)       Info, in progress, sent
  gray    (bg-gray-100 / text-gray-600 / border-gray-200)      Neutral, voided, archived
  purple  (bg-purple-50 / text-purple-700 / border-purple-200) Manufacturing, production

Dark mode:
  Nuxt UI handles dark mode automatically via .dark class.
  All bg/text/border tokens have dark: equivalents.
```

---

## Typography

```
Font stack: Inter (system-ui fallback)

Scale:
  text-2xl font-semibold   Page titles
  text-lg font-medium      Section headers, card titles
  text-sm font-medium      Table column headers, labels
  text-sm                  Body text, table cell content
  text-xs                  Captions, timestamps, badges

Numbers (financial data):
  font-mono text-sm        All monetary amounts, quantities
  tabular-nums             Ensures column alignment in tables
```

---

## Spacing & Layout

```
Page layout:
  Sidebar: 240px fixed (desktop), collapsible to 64px icon-only
  Content area: max-w-7xl mx-auto px-6 py-8

Content rhythm:
  Section gaps: space-y-6
  Card padding: p-5
  Table cell padding: px-4 py-3

Breakpoints:
  sm: 640px   (tablet — sidebar collapses, some columns hide)
  lg: 1024px  (desktop — full layout)
```

---

## Components

### Status Badge
```
Pill with subtle background:
  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
               bg-green-50 text-green-700 border border-green-200">
    ● Active
  </span>

Dot colors match status (green/yellow/red/blue/gray/purple).
```

### Page Header
```
Page title on the left, primary action button(s) on the right.
Breadcrumbs above the title on detail pages.
Never more than 2 action buttons visible; overflow goes into a "⋯" menu.
```

### Data Table
```
- Sticky header
- Row hover: bg-gray-50
- Selected row: bg-indigo-50 border-l-2 border-indigo-500
- Numeric columns: right-aligned, font-mono
- Status column: badge component
- Actions column: icon buttons, visible on row hover only
- Empty state: centered illustration + message + primary CTA
- Loading state: skeleton rows (not spinner)
```

### Card
```
bg-white border border-gray-200 rounded-xl p-5
No box shadows on cards — borders only.
Use shadow-sm only on floating elements (dropdowns, modals, command palette).
```

### Form Fields
```
Label above input (never placeholder-as-label).
Helper text below in text-gray-500 text-xs.
Error text below in text-red-600 text-xs.
Input: bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm
Focus: ring-2 ring-indigo-500 border-transparent
```

### Command Palette (⌘K)
```
Global search + quick actions.
Opens as a modal over the page.
Searches products, customers, vendors, orders simultaneously.
Keyboard navigable.
```

### Notifications Drawer
```
Slides in from the right (not a modal).
Shows unread count badge on bell icon in sidebar.
```

---

## Iconography

Use **Heroicons** (included in Nuxt UI). 20px (`size-5`) for inline icons, 24px (`size-6`) for sidebar nav, 16px (`size-4`) for badge icons and table row actions.

Never use emoji in the product UI. Use icons.

---

## Motion

```
Transitions: 150ms ease-out (fast, not flashy)
Page transitions: fade (100ms)
Slide panels: translate-x with 200ms ease-out
Skeleton loaders: animate-pulse
Toasts: slide-in from bottom-right, auto-dismiss 4s
```

---

## Empty States

Every list view and dashboard widget needs an empty state:

```
  Centered in the content area
  Icon (outlined, text-gray-300, size-12)
  Title: text-gray-900 font-medium
  Description: text-gray-500 text-sm
  Primary CTA button
```

---

## Key UX Patterns

**Optimistic updates** — Apply changes immediately in the UI; revert on API error with a toast.

**Inline confirmation** — For destructive actions: replace button with "Are you sure? [Confirm] [Cancel]" inline. No modal for simple deletes.

**Sheet (side panel) for create/edit** — Use a slide-in sheet for creating/editing records rather than navigating to a new page. Keeps context. Full page navigation only for detail views.

**Keyboard shortcuts** — ⌘K global search, ⌘N new record (context-aware), ⌘S save, Esc close panel.

**Toast notifications** — Success and error feedback via toasts (bottom-right). Never use alert() or inline blocking messages for transient feedback.

**Number formatting** — Currency always `$0.00` format (locale: en-US). Quantities with 2 decimal places where fractional (3.50 kg), whole numbers for each/count (240). Large numbers with commas: 1,240.
