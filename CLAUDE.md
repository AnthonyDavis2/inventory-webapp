# CLAUDE.md — Business Operations Platform

Read this file at the start of every session. It is the authoritative orientation for this codebase.

---

## What This Is

A **multi-tenant SaaS platform** for small US manufacturers, wholesalers, and retailers. Single currency (USD), US market only for MVP. Built and maintained by a **solo developer**.

Full product spec: `docs/PROMPT.md`  
Non-negotiable rules: `docs/CONSTITUTION.md` — every line of code must comply.

---

## Tech Stack (Locked — Do Not Change)

| Layer | Choice |
|---|---|
| Frontend | Nuxt 4, Vue 3 (`<script setup>` only), TypeScript strict, Tailwind, Nuxt UI, Pinia, VeeValidate + Zod |
| Backend | NestJS, TypeScript strict, Prisma, PostgreSQL 15+ |
| Cache / Queue | Upstash Redis + BullMQ |
| Storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| Payments | Stripe (Stripe Billing for subscriptions) |
| PDF | Gotenberg (self-hosted, async via BullMQ) |
| Error tracking | Sentry |
| Hosting | Vercel (frontend), Railway (backend + Redis), Neon (PostgreSQL) |
| Monorepo | pnpm workspaces + Turborepo |

---

## Architecture Rules (Non-Negotiable)

- **Modular monolith** — one deployable unit, module boundaries enforced by NestJS modules
- **DDD** — code organized by business domain, never by technical layer
- **Clean architecture layers**: Controller → UseCase → DomainService → Repository → Prisma
- **Multi-tenancy**: PostgreSQL RLS + `org_id` on every business table + `orgId` from JWT only, never from request body/URL
- **Inventory ledger is immutable** — never UPDATE or DELETE a ledger entry; corrections via reversal + new entry
- **Money = BIGINT cents** — never float, never decimal for money, convert to dollars only at UI layer
- **All IDs = UUID** — never integer sequences
- **Soft deletes** on all business-critical records (`deleted_at`, `deleted_by`)
- **Events for cross-module communication** — NestJS EventEmitter2 internally, BullMQ for async jobs
- **No `forwardRef()`** — circular deps are a design problem, fix the design

---

## Key Documents

| Document | Purpose |
|---|---|
| `docs/architecture/schema.prisma` | **Start here** — the full database schema, all enums, all indexes |
| `docs/architecture/domain-model.md` | Entities, bounded contexts, relationships, domain invariants |
| `docs/architecture/module-dependency-map.md` | Build order for all 32 modules; what depends on what |
| `docs/product/permission-matrix.md` | Role × module × action; sensitive field visibility rules |
| `docs/MVP-SCOPE.md` | Confirmed in/out of scope — check before implementing anything |
| `docs/decisions/service-decision-matrix.md` | All third-party services, npm packages, env var names |
| `docs/decisions/deployment-runbook.md` | Local setup, CI/CD, go-live checklist |
| `docs/decisions/technical-debt-register.md` | Known MVP shortcuts — check before "improving" something |
| `docs/ux/sitemap.md` | All routes and navigation structure |
| `docs/ux/wireframes/` | Onboarding + key module wireframes |

---

## Build Order

Build phases in this order — each phase unlocks the next:

1. **Core infrastructure** — config, database, auth, tenant middleware, audit, events, queue, storage, mail, pdf, search
2. **Platform** — organizations, users, billing (Stripe)
3. **Foundation** — UOM, warehouses + bin locations
4. **Catalog** — products, variants, categories, barcodes
5. **Inventory** — ledger, FIFO layers, WAC, lots, serials, adjustments, transfers, cycle counts
6. **Procurement** — vendors, purchase orders, receiving, reorder rules
7. **Sales** — customers, pricing, quotes, sales orders, fulfillment, invoicing, payments
8. **Manufacturing** — BOM, BOM versions, work orders, QC, scrap
9. **Costing + Reporting** — standard costs, BOM cost builder, overhead, dashboards, reports
10. **Platform support** — notifications, CSV imports, audit log viewer, expenses, accounting

**Current status:** Monorepo scaffold complete. `pnpm install` clean. Prisma client generated. TypeScript compiles with no errors. All 32 NestJS modules stubbed. All 20 frontend feature directories created. **Phase 1 core infrastructure complete:** ConfigModule (Joi env validation), DatabaseModule/PrismaService (with `setTenantContext` for RLS), AuthModule (JWT access tokens + HttpOnly refresh token cookie rotation + TOTP MFA via otplib, global JwtAuthGuard + `@Public()` decorator), TenantModule (middleware sets `app.current_org_id` per request), QueueModule (BullMQ with named queues: email/pdf/notifications/imports), StorageModule (Cloudflare R2 upload/download/presigned URLs), MailModule (Resend client + invitation/welcome/reset templates), PdfModule (Gotenberg HTML→PDF), AuditModule (AuditLog writer), SearchModule (pg_trgm ILIKE helper). **Phase 2 complete:** OrganizationsModule (`POST /organizations` public registration with org+owner+default CoA+document sequences+tax settings seeded in one transaction; `GET/PATCH /organizations/me`; `PATCH /organizations/me/onboarding` steps 1–7). UsersModule (`GET /users`, `GET /users/:id`, `POST /users/invite` + email, `POST /users/accept-invite` public, `PATCH /users/:id`, `DELETE /users/:id` deactivate, `PATCH /users/:id/reactivate`). `@Roles()` decorator + `RolesGuard` for per-route authorization. **Next: Phase 2 remainder — BillingModule (Stripe Billing: subscription creation, webhook handler, plan enforcement).**

---

## MVP Scope Enforcement

Before implementing any feature, check `docs/MVP-SCOPE.md`. If it is listed under "Out of Scope", say:

> "This is a Phase 2 item per the MVP scope. The MVP approach is [X]. Including it now will delay MVP launch."

**Phase 2 items never silently implemented:** TaxJar/Avalara, EasyPost/ShipStation, QuickBooks/Xero sync, custom RBAC, offline mode, Meilisearch, demand forecasting, three-way match, customer portal, WebSockets, ZPL printing.

---

## Developer Preferences

- Make all technical decisions autonomously — only ask when it is genuinely the user's call (pricing, business strategy, irreversible high-cost decisions)
- No unnecessary comments in code — only when the WHY is non-obvious
- No extra features, abstractions, or refactors beyond what the task requires
- Conventional Commits format: `feat(module): description`
- Test tenant isolation for every module with business data before marking it complete
