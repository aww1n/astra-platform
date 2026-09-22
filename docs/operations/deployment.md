# Deployment, recovery, and production readiness

## Environments

Development, staging, and production have separate accounts/projects,
databases, Redis/queues, object stores, secrets, credentials, provider configs,
networks, and observability access. DEMO and PRODUCTION also use separate ledger
accounts and preferably separate database/infra boundaries. Production secrets
never enter development or staging.

```text
Internet -> CDN/WAF -> reverse proxy/ingress
                    -> Mini App static origin
                    -> User API pods -> PostgreSQL/Redis
Admin network/origin -> Admin API pods -> PostgreSQL
Workers -> provider egress gateway -> external providers
All -> metrics/logs/traces; audit -> protected/WORM export
```

Database is private. Network policies isolate edge, user/admin API, workers,
data, provider egress, observability, and secrets/KMS zones.

## Delivery

CI creates scanned, immutable artifacts. CD applies expand/contract migrations,
deploys to staging, runs smoke/E2E, then uses approved gradual production
rollout with feature/operational flags. Critical migration plans document
compatibility, backup, restore/forward-fix, and staging evidence.

## Backup and disaster recovery

PostgreSQL uses encrypted automated backups and PITR with offsite/cross-region
copies where required. Object/evidence stores use versioning/retention. Redis is
rebuildable and not financial truth. Restore tests and recovery drills—not
backup job success—prove recoverability.

RPO/RTO values are explicitly approved before production. Runbooks cover DB,
Redis, queues, providers, Telegram, network partitions, credential compromise,
region loss, and ledger/reconciliation incidents. Recovery always includes
integrity checks and reconciliation before reopening money movement.

## Production readiness gate

`PRODUCTION_REAL_MONEY=false` by default. Enabling requires recorded approval
that all critical items are complete:

- selected jurisdiction, operator/legal structure, licences/permissions, and
  professional legal/compliance review;
- approved sports/odds/result, KYC, AML/KYT, payment/custody contracts that
  explicitly permit the use case and target market;
- geo, age, KYC, sanctions, RG, complaints, betting rules, terms/privacy,
  regulatory reporting and customer-funds controls implemented;
- DEMO/PRODUCTION isolation, ledger invariants, reconciliation, race/duplicate,
  settlement/correction, and custody idempotency verified;
- threat model, external penetration test, remediation, KMS/signing, maker-
  checker, audit and data-retention controls complete;
- load/soak/failover, backup restore, DR and incident exercises passed;
- production monitoring/alerts, on-call, support and escalation operational;
- testnet E2E and controlled mainnet pilot passed for each approved payment rail.

Any unmet critical item keeps real-money betting, deposits, and withdrawals
disabled server-side.
