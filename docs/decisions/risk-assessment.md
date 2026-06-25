# Risk Assessment

Last updated: 2026-06-24

---

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| Inventory ledger bugs (wrong balances) | Medium | Critical | Comprehensive integration tests for every movement type; balance reconciliation job; point-in-time snapshot verification |
| FIFO cost layer drift (wrong COGS) | Medium | Critical | Unit tests for layer consumption order; test after every receipt + shipment combination |
| Tenant data leakage via missing org_id filter | Medium | Critical | RLS as safety net; tenant isolation tests required per module before shipping |
| Costing method locked prematurely | Low | High | UI warning + backend guard; only lock after first ledger entry is posted (not on save) |
| Stripe webhook delivery failure / duplicate | Medium | High | Idempotent webhook processing using Stripe event ID; webhook retry handling |
| Prisma migration failure in production | Low | High | Zero-downtime migration pattern; additive changes first; staging test before prod |
| BullMQ job silently failing | Medium | Medium | Dead letter queue; job retry with backoff; Sentry alerts on job failure |
| PDF generation timeout (large documents) | Low | Medium | Async generation via queue; timeout set on Gotenberg container; notify user on completion |
| R2 upload failure losing user files | Low | Medium | Pre-upload validation; retry on failure; never mark upload complete until R2 confirms |
| Integer overflow on very large monetary values | Very Low | High | BigInt throughout; validate input max values; test with values > $1M |

---

## Business Risks

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| Solo developer bus factor | High | Critical | Document everything; CONSTITUTION + README; modular design so any module can be handed off |
| MVP scope creep killing launch | High | High | CONSTITUTION §21 enforces scope; always flag Phase 2 items explicitly |
| Customers choosing wrong costing method | Medium | High | Clear UI explanation at onboarding; locked after first transaction with support escalation path |
| Customers with complex UOM conversions creating errors | Medium | Medium | Test UOM conversion validation thoroughly; show preview of converted quantities before saving |
| Free trial abuse (repeated signups) | Low | Medium | Email verification required; HaveIBeenPwned check; Stripe can flag patterns |
| Data loss from accidental hard delete | Low | Critical | Soft deletes on all business records; no hard delete exposed in API; only admin can hard delete sessions |

---

## Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| Neon PostgreSQL outage | Low | Critical | Connection pooling (PgBouncer); read replica for reporting; daily backups verified |
| Upstash Redis outage | Low | Medium | BullMQ jobs: Redis reconnect with backoff; rate limiting fails open (allow request) not closed |
| Vercel cold start latency | Low | Low | Edge functions for auth; aggressive caching for static assets |
| Railway backend restart mid-request | Low | Medium | Graceful shutdown handler; in-flight requests complete before restart |
| Stripe API downtime | Low | Medium | Webhook replay on recovery; subscription status cached locally; never block operations on Stripe response |

---

## Security Risks

| Risk | Likelihood | Impact | Mitigation |
|---|:---:|:---:|---|
| JWT secret compromise | Very Low | Critical | Short access token TTL (15 min); refresh token rotation; revocation via Redis |
| SQL injection via Prisma raw query | Very Low | Critical | Never use `$queryRaw` with string interpolation; only parameterized |
| SSRF via PDF generation (user-supplied HTML) | Low | High | Gotenberg runs in isolated container; no network access from PDF renderer; sanitize template inputs |
| File upload malware injection | Low | Medium | MIME type check (magic bytes); size limits; UUID filenames; virus scan in Phase 2 |
| Rate limit bypass (multi-IP) | Medium | Low | Per-user AND per-org limits; Cloudflare WAF in Phase 2 |
| Enumeration via sequential IDs | N/A | N/A | All IDs are UUID — not enumerable |

---

## Known MVP Shortcuts (Technical Debt)

See `technical-debt-register.md` for the complete list.
