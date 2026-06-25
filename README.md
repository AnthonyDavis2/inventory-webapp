# Business Operations Platform

A multi-tenant SaaS platform for inventory management,
manufacturing, purchasing, sales, costing, and business analytics.

## Tech Stack

Frontend
- Nuxt 4
- Vue 3
- TypeScript
- Tailwind
- Nuxt UI

Backend
- NestJS
- TypeScript

Infrastructure
- PostgreSQL
- Redis
- BullMQ
- S3 Storage

## Architecture

This project follows:

- Domain Driven Design
- Feature-Based Modular Monolith Architecture
- Clean Architecture
- Event-Driven Design

See:

docs/architecture/system-overview.md

## Development

### Install

...

### Run

...

### Test

...

## Documentation

### Product
- [PRD](docs/product/PRD.md) — Full product requirements
- [MVP Scope](docs/MVP-SCOPE.md) — Confirmed in/out of scope feature list
- [Permission Matrix](docs/product/permission-matrix.md) — Role × module × action

### Architecture
- [Domain Model](docs/architecture/domain-model.md) — Entities, relationships, bounded contexts
- [Module Dependency Map](docs/architecture/module-dependency-map.md) — Build order and cross-module rules
- [Database Schema](docs/architecture/schema.prisma) — Full Prisma schema (source of truth)

### UX
- [Sitemap](docs/ux/sitemap.md) — All routes and navigation structure
- [Onboarding Wireframes](docs/ux/wireframes/onboarding.md) — 7-step wizard
- [Key Module Wireframes](docs/ux/wireframes/key-modules.md) — Dashboard, inventory, PO, SO, invoice, BOM, WO

### Decisions & Operations
- [Service Decision Matrix](docs/decisions/service-decision-matrix.md) — All third-party service choices + rationale
- [Deployment Runbook](docs/decisions/deployment-runbook.md) — Local setup, CI/CD, go-live checklist
- [Risk Assessment](docs/decisions/risk-assessment.md) — Technical, business, and security risks
- [Technical Debt Register](docs/decisions/technical-debt-register.md) — Known MVP shortcuts

### Source
- [CONSTITUTION.md](docs/CONSTITUTION.md) — Non-negotiable rules and coding standards
- [PROMPT.md](docs/PROMPT.md) — Original product specification
