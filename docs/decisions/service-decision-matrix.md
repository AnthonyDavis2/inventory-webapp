# Third-Party Service Decision Matrix

Last updated: 2026-06-24

All service choices are **locked for MVP**. Do not substitute without updating this document and the CONSTITUTION.

---

## Infrastructure

| Category | Service | Rationale | Plan / Cost | Phase |
|---|---|---|---|---|
| Frontend Hosting | Vercel | Zero-config Nuxt 4 deployment, edge CDN, preview deployments per PR | Hobby free → Pro $20/mo | MVP |
| Backend Hosting | Railway | Unified dashboard for NestJS + Redis, auto-deploy from Git, simple env management for solo dev | Starter $5/mo + usage | MVP |
| Database (PostgreSQL) | Neon | Managed PostgreSQL 15+, branching per environment (dev/staging/prod), serverless scaling | Free tier → $19/mo | MVP |
| Cache / Queue Backend | Upstash Redis | Serverless Redis, pay-per-request, zero maintenance, REST + SDK | Free tier → $0.2/100k commands | MVP |
| File Storage | Cloudflare R2 | S3-compatible, zero egress fees, cheap storage, CORS-friendly | $0.015/GB storage, free egress | MVP |
| CI/CD | GitHub Actions | Free for public repos, affordable for private, native Git integration | Free 2000 min/mo | MVP |

---

## Application Services

| Category | Service | Rationale | Plan / Cost | Phase |
|---|---|---|---|---|
| Email (transactional) | Resend | Simple REST API, generous free tier (3,000 emails/mo), excellent DX, React Email templates | Free → $20/mo | MVP |
| Payments & Billing | Stripe | Industry standard, Stripe Billing handles subscription complexity, webhook-driven, Stripe-hosted customer portal | 2.9% + 30¢ per transaction | MVP |
| Error Tracking | Sentry | Best-in-class error tracking, source maps, org/user context, alerting | Free 5k errors/mo | MVP |
| Uptime Monitoring | Better Uptime | 1-min checks, email + SMS alerts, status page | Free tier | MVP |
| PDF Generation | Gotenberg | Self-hosted Docker container, HTML→PDF via Puppeteer/Chrome, no per-request cost, runs on Railway | Free (compute cost only) | MVP |
| Logging | Logtail (Better Stack) | Structured log ingestion, 30-day retention, works with Pino, generous free tier | Free 1GB/mo | MVP |

---

## Phase 2 Services (Deferred — Do Not Implement in MVP)

| Category | Service | Reason Deferred |
|---|---|---|
| Tax Calculation | TaxJar or Avalara | Manual tax rate sufficient for MVP; API integration adds scope |
| Shipping | EasyPost | Manual tracking number recording sufficient for MVP |
| Accounting Sync | QuickBooks Online API | CSV export sufficient for MVP; live sync is Phase 2 |
| Search | Meilisearch | PostgreSQL `pg_trgm` sufficient for MVP search volume |
| APM | Datadog / New Relic | Sentry Performance sufficient for MVP; revisit at scale |

---

## Integration Packages (npm)

| Service | Package |
|---|---|
| Stripe | `stripe` (official SDK) |
| Resend | `resend` (official SDK) |
| Sentry (backend) | `@sentry/nestjs` |
| Sentry (frontend) | `@sentry/nuxt` |
| AWS S3 / R2 | `@aws-sdk/client-s3` (R2 is S3-compatible) |
| Upstash Redis | `@upstash/redis` |
| BullMQ | `bullmq` |
| Prisma | `prisma` + `@prisma/client` |
| MFA / TOTP | `otplib` |
| Password breach check | `@haveibeenpwned/haveibeenpwned` or direct API call |
| Logging | `pino` + `pino-pretty` (dev) |
| PDF (Gotenberg client) | `chromiumly` or raw HTTP to Gotenberg |

---

## Environment Variable Summary

```
# Database
DATABASE_URL=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Payments (Stripe)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# PDF (Gotenberg)
GOTENBERG_URL=

# Error Tracking
SENTRY_DSN=

# App
NODE_ENV=
APP_URL=
API_URL=
PORT=3001
```
