# ASTRA architecture baseline

This directory is the pre-code baseline required by the ASTRA specification.
The documents collectively cover all 43 mandatory deliverables.

| Deliverables | Document |
|---|---|
| 1–5 Architecture, boundaries, components, monorepo, contexts | [architecture/system.md](architecture/system.md) |
| 6 ERD | [database/erd.md](database/erd.md) |
| 7–12 Money, ledger, invariants, transactions, idempotency, outbox | [architecture/financial-kernel.md](architecture/financial-kernel.md) |
| 13–14 API and WebSocket | [api/contracts.md](api/contracts.md) |
| 15–16 Telegram architecture and authentication | [architecture/telegram.md](architecture/telegram.md) |
| 17–22 Betting, snapshots, rules, settlement, corrections, payout | [architecture/betting.md](architecture/betting.md) |
| 23–25 Deposits, withdrawals, treasury/custody | [architecture/payments.md](architecture/payments.md) |
| 26–30 Risk, fraud, KYC/AML/KYT, RG, jurisdiction | [architecture/compliance.md](architecture/compliance.md) |
| 31–32 Providers and reconciliation | [architecture/providers.md](architecture/providers.md) |
| 33–35 Admin, RBAC/maker-checker, audit | [architecture/admin.md](architecture/admin.md) |
| 36 Security and threat model | [security/threat-model.md](security/threat-model.md) |
| 37 UI screen map | [product/screen-map.md](product/screen-map.md) |
| 38 Testing strategy | [testing/strategy.md](testing/strategy.md) |
| 39 Observability and SLO | [operations/observability.md](operations/observability.md) |
| 40–42 Deployment, backup/DR, readiness gate | [operations/deployment.md](operations/deployment.md) |
| 43 Roadmap | [roadmap.md](roadmap.md) |

## Decision status

This baseline intentionally leaves jurisdiction-specific thresholds, provider
contracts, betting rules, and custody vendor selection unresolved. They require
legal, compliance, commercial, and operational approval before production.
