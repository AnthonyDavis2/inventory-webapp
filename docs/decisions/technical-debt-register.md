# Technical Debt Register

Last updated: 2026-06-24

These are deliberate shortcuts taken for MVP speed. Each item has a tracking note for when to address it.

---

| ID | Area | Shortcut Taken | Full Solution | Address When |
|---|---|---|---|---|
| TD-001 | Tax | Manual flat tax rate per org instead of TaxJar/Avalara API | TaxJar/Avalara integration with per-state nexus rules and product-level tax categories | Phase 2 — before reaching $1M ARR or operating in states with complex tax rules |
| TD-002 | Shipping | Record carrier + tracking number manually; no label purchase | EasyPost/ShipStation integration for label purchase, rate comparison, tracking webhooks | Phase 2 |
| TD-003 | Accounting | CSV export for QuickBooks/Xero manual import | QuickBooks Online or Xero live API sync | Phase 2 |
| TD-004 | Search | PostgreSQL `pg_trgm` for full-text search | Meilisearch for better relevance scoring, typo tolerance, and faceted search | Phase 2 — when search becomes a user complaint or query time exceeds 500ms |
| TD-005 | Notifications | Polling-based in-app notifications (client polls every 30s) | SSE (Server-Sent Events) for real-time push without WebSocket complexity | Phase 2 |
| TD-006 | RBAC | Fixed 8-role permission model | Per-org configurable permission matrix (role × module × action) | Phase 2 |
| TD-007 | Offline | Requires internet connectivity | IndexedDB + service worker sync queue for warehouse scanning | Phase 2 |
| TD-008 | Reporting | In-memory aggregation for dashboard KPIs | Materialized views or a read-model layer for large orgs | When any KPI query exceeds 1 second on real data |
| TD-009 | PDF | Synchronous PDF generation for small docs | All PDFs async via BullMQ queue (already the design, but small documents may be inline initially) | At launch if Gotenberg adds > 2s latency |
| TD-010 | Virus scanning | No malware scan on file uploads | ClamAV or cloud scan service on every upload | Phase 2 — before accepting user-uploaded documents publicly |
| TD-011 | Price lists | Flat price / markup / discount only; no quantity breaks or date-effective prices | Full price matrix with quantity breaks (tiered pricing) and date-effective rules | Phase 2 |
| TD-012 | Purchasing | No three-way match (PO → Receipt → Vendor Invoice) | Three-way match with variance approval workflow | Phase 2 |
| TD-013 | Customer portal | No self-service portal for customers to view invoices or pay | Customer-facing portal with invoice history and Stripe payment | Phase 2 |
| TD-014 | BOM costing | Labor rate is a flat org-level rate, not per work center | Work center model with individual labor rates and capacity planning | Phase 2 |
| TD-015 | Barcode labels | No ZPL printing for thermal label printers | ZPL generation and network print via CUPS or Zebra SDK | Phase 2 |
| TD-016 | Image CDN | Pre-signed URLs from R2 directly | CloudFront or Cloudflare Images CDN with automatic resizing | When image load times become a complaint |
| TD-017 | Overhead allocation | One method per org, no per-product override | Per-product overhead allocation method | Phase 2 |
