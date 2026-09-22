# Delivery roadmap

Each phase requires reviewed contracts, migrations, failure modes, metrics,
security impact, documentation, and automated tests. UI alone is never Done.

1. **Baseline** — approve ADRs, invariants, context map, ERD, APIs, threat model,
   transaction boundaries, ruleset model, readiness gate.
2. **Financial kernel** — TypeScript money/odds primitives, PostgreSQL schema,
   double-entry ledger, reservations, idempotency, inbox/outbox, immutable audit,
   property and race tests.
3. **Identity and policy shell** — Telegram auth/session, user status, RBAC,
   configuration versions, feature/kill switches, eligibility abstractions.
4. **Sports and trading** — mock provider, catalog/mapping, market lifecycle,
   odds versions/publication, exposure/limits, realtime snapshot/resync.
5. **Betting** — quotes, immutable snapshots, single/express/system, correlation,
   risk/limits, atomic acceptance.
6. **Settlement** — result policy/evidence, deterministic engine, revisions,
   payout, correction/reversal, reconciliation.
7. **DEMO product** — bot, Mini App, demo wallet/deposit/withdrawal, notifications,
   profile, support, E2E journey.
8. **Admin operations** — users, trading, bets, settlements, payments, KYC/risk,
   maker-checker, audit/evidence and reconciliation consoles.
9. **Payments sandbox** — asset/network model, mock then testnet custody adapter,
   webhook/poller convergence, treasury, fees/finality/reorgs, chaos tests.
10. **Hardening** — load/soak, failure tests, pentest, restore/DR exercises,
    operational dashboards and runbooks.
11. **Market readiness** — jurisdiction-specific rules, licences, contracts,
    legal documents, compliance integrations, training and reporting.
12. **Controlled production** — separately approved limited rollout, intensive
    monitoring/reconciliation, incident readiness, gradual scale.

## Immediate implementation slice after baseline approval

- repository/toolchain and CI;
- `Money` and decimal odds primitives with property tests;
- ledger schema and database-enforced balance/immutability;
- idempotency/inbox/outbox primitives;
- wallet reservation service;
- DEMO-only API health/readiness and first financial integration tests.
