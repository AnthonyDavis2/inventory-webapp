# Deployment Runbook

Last updated: 2026-06-24 (rev 2)

---

## Environments

| Environment | Frontend | Backend | Database | Redis |
|---|---|---|---|---|
| Local (dev) | `localhost:3000` | `localhost:3001` | Docker `localhost:5432` | Docker `localhost:6379` |
| Staging | Vercel preview | Railway staging | Neon `staging` branch | Upstash staging |
| Production | Vercel production | Railway production | Neon `main` branch | Upstash production |

---

## Local Development Setup

### Prerequisites
- Node.js 24+ (CI uses Node 24; local dev should match)
- pnpm 11.9.0+ (`packageManager` field in root `package.json` pins this)
- Docker Desktop

### First-time setup

```bash
# Clone
git clone <repo>
cd inventory-app

# Install dependencies
pnpm install

# Copy env files
cp apps/backend/.env.example apps/backend/.env.development
cp apps/frontend/.env.example apps/frontend/.env.development

# Start Docker services (PostgreSQL + Redis)
docker compose up -d

# Run database migrations
cd apps/backend
pnpm prisma migrate dev

# Seed database (UOM library, default accounts, expense categories)
pnpm prisma db seed

# Start development servers (from root)
cd ../..
pnpm dev
```

### Default URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API docs (Swagger): http://localhost:3001/api/docs
- Gotenberg (PDF): http://localhost:3002

### Docker Compose services
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: inventory_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  gotenberg:
    image: gotenberg/gotenberg:8
    ports: ["3002:3000"]
```

---

## Required Environment Variables

### Backend (`apps/backend/.env.{environment}`)

```bash
# App
NODE_ENV=development|staging|production
PORT=3001
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_dev

# Redis (Upstash in staging/prod, local in dev)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# Local dev:
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<min 32 char random string>
JWT_REFRESH_SECRET=<min 32 char random string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_GROWTH_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Business Ops Platform

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=inventory-app-dev
R2_PUBLIC_URL=https://your-r2-domain.com

# PDF (Gotenberg)
GOTENBERG_URL=http://localhost:3002

# Error Tracking
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
```

### Frontend (`apps/frontend/.env.{environment}`)

```bash
NUXT_PUBLIC_API_URL=http://localhost:3001
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NUXT_PUBLIC_SENTRY_DSN=
NUXT_PUBLIC_SENTRY_ENVIRONMENT=development
```

---

## CI/CD Pipeline (GitHub Actions)

### Trigger: Push to `main`
```
1. Lint (ESLint + Prettier check)
2. Type check (tsc --noEmit on backend + frontend)
3. Unit tests (Jest — backend; Vitest — frontend)
4. Integration tests (Jest + real PostgreSQL via Docker service)
5. Build (nest build + nuxt build)
6. Deploy → Staging (Railway + Vercel preview)
7. Run staging smoke tests (Playwright — 3 critical flows)
```

### Trigger: Tag `v*.*.*`
```
1. All above steps
2. Manual approval gate (GitHub environment protection)
3. Run database migrations on production (Railway deploy hook)
4. Deploy → Production (Railway + Vercel production)
5. Verify health check (GET /health + GET /health/detailed)
6. Post deploy notification (Slack or email)
```

---

## Database Migrations

### Applying migrations

```bash
# Development
pnpm prisma migrate dev --name <descriptive-name>

# Staging / Production (via CI)
pnpm prisma migrate deploy
```

### Zero-downtime migration pattern

For any schema change on a column that already has data:

```
Deploy 1: Add new column (nullable)
       ↓
       Backfill data (via migration or background job)
       ↓
Deploy 2: Add NOT NULL constraint + drop old column
```

Never rename a column in a single migration — it drops and recreates the column.

### Migration checklist before production deploy
- [ ] Migration tested on staging with production-sized data
- [ ] Migration is additive only (no drops in the same deploy as code that depends on new shape)
- [ ] Indexes added for new columns that will be used in WHERE/ORDER BY
- [ ] RLS policies added for any new business tables
- [ ] Seed data updated if new enum values or default records are required

---

## Stripe Setup Checklist

### One-time setup

1. Create Stripe account
2. Create Products + Prices in Stripe Dashboard:
   - Starter: $49/mo monthly + $490/yr annual
   - Growth: $129/mo monthly + $1,290/yr annual
   - Business: $299/mo monthly + $2,990/yr annual
3. Copy Price IDs into environment variables
4. Set up Stripe webhook endpoint: `POST /api/v1/billing/webhook`
5. Enable webhook events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
6. Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`

---

## Resend Setup Checklist

1. Create Resend account + workspace
2. Verify sending domain (add DNS records)
3. Copy API key into `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to a verified sending address
5. Test transactional email delivery in staging before launch

---

## Go-Live Checklist

### Infrastructure
- [ ] Neon production branch created, migrations applied
- [ ] Railway production service deployed, env vars set
- [ ] Vercel production deployment successful
- [ ] Upstash production Redis instance created
- [ ] R2 production bucket created with CORS policy
- [ ] Gotenberg running on Railway (same service or separate)

### Services
- [ ] Stripe production keys configured (not test keys)
- [ ] Stripe webhook endpoint registered for production URL
- [ ] Resend production API key + verified domain
- [ ] Sentry DSN configured for both backend + frontend
- [ ] Better Uptime monitoring set up for `/health`

### Security
- [ ] JWT secrets are strong random strings (not reused from staging)
- [ ] CORS whitelist contains only production frontend URL
- [ ] HTTPS enforced (Railway + Vercel both do this automatically)
- [ ] No `console.log` secrets in deployed code (verify via Sentry)

### Testing
- [ ] E2E smoke test: register new org + complete onboarding
- [ ] E2E smoke test: receive PO → check inventory balance
- [ ] E2E smoke test: create sales order → invoice → record payment
- [ ] Stripe test payment completed successfully on production
- [ ] Health check endpoint returns 200

### Monitoring
- [ ] Error rate alert configured in Sentry (> 1% errors)
- [ ] Uptime alert configured (SMS + email)
- [ ] Log shipping to Logtail configured
- [ ] First admin user created and MFA enabled

---

## Rollback Procedure

### Code rollback (Railway)
```bash
# In Railway dashboard: Deployments → previous deployment → Redeploy
# Or via CLI:
railway rollback
```

### Migration rollback
Prisma does not support automatic rollback. For additive migrations (add column), they are safe to leave. For structural changes, a forward-only compensating migration must be written manually.

### Emergency: read-only mode
Set `IS_READ_ONLY=true` on all organizations via direct database update (requires Railway → Database → Query editor access or direct Neon connection):

```sql
UPDATE organizations SET is_read_only = true;
```

This blocks all write operations at the API layer without taking the service down.
