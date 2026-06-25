# Business Operations Platform

A multi-tenant SaaS platform for small US manufacturers, wholesalers, and retailers. Covers the full business lifecycle: purchasing, inventory, sales, invoicing, manufacturing, costing, and reporting — all in one place.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Nuxt 4, Vue 3, TypeScript, Tailwind, Nuxt UI, Pinia |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL 15 (with Row Level Security for multi-tenancy) |
| Queue | Redis + BullMQ |
| Storage | Cloudflare R2 |
| Email | Resend |
| Payments | Stripe |
| PDF | Gotenberg |

## Architecture

- **Modular monolith** — one deployable unit, module boundaries enforced by NestJS
- **Domain Driven Design** — code organized by business domain
- **Clean Architecture** — Controller → UseCase → DomainService → Repository → Prisma
- **Multi-tenant** — PostgreSQL RLS + `org_id` on every business table

## Running Locally

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) — for Postgres, Redis, and Gotenberg
- Node.js 24 — `brew install node@24`
- pnpm — `npm install -g pnpm`

### First-time setup

```bash
pnpm install
pnpm db:migrate
```

When prompted for a migration name, type `init` and press Enter.

### Start the app (3 terminal tabs)

**Tab 1 — Database**
```bash
docker compose up
```

**Tab 2 — Backend** (wait for Tab 1 to be ready)
```bash
pnpm --filter backend dev
```

**Tab 3 — Frontend** (wait for Tab 2 to show port 3001)
```bash
pnpm --filter frontend dev
```

Open **http://localhost:3000**, register an account, and complete onboarding.

> Stripe, email, and file uploads require real credentials. See the [Deployment Runbook](docs/decisions/deployment-runbook.md) for setup. All other features work locally without any accounts.

## Common Commands

```bash
pnpm install          # Install all dependencies
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript check all packages
pnpm test             # Run all tests
pnpm build            # Production build

pnpm db:migrate       # Create and apply a new migration (dev)
pnpm db:studio        # Open Prisma Studio (database GUI)
pnpm db:generate      # Regenerate Prisma client after schema changes
```

## Project Structure

```
apps/
  backend/            # NestJS API (port 3001)
  frontend/           # Nuxt 4 app (port 3000)
docs/
  architecture/       # Schema, domain model, module map
  decisions/          # Deployment runbook, tech debt, service choices
  product/            # PRD, permission matrix, MVP scope
  ux/                 # Sitemap, wireframes, design system
```

## Documentation

### Product
- [MVP Scope](docs/MVP-SCOPE.md) — Confirmed in/out of scope features
- [Permission Matrix](docs/product/permission-matrix.md) — Role × module × action

### Architecture
- [Database Schema](docs/architecture/schema.prisma) — Full Prisma schema (source of truth)
- [Domain Model](docs/architecture/domain-model.md) — Entities, relationships, bounded contexts
- [Module Dependency Map](docs/architecture/module-dependency-map.md) — Build order and cross-module rules

### UX
- [Sitemap](docs/ux/sitemap.md) — All routes and navigation
- [Wireframes](docs/ux/wireframes/) — Onboarding and key module layouts

### Operations
- [Deployment Runbook](docs/decisions/deployment-runbook.md) — Local setup, CI/CD, go-live checklist
- [Technical Debt Register](docs/decisions/technical-debt-register.md) — Known MVP shortcuts
- [Service Decision Matrix](docs/decisions/service-decision-matrix.md) — Third-party service choices
