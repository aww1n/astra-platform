# Provider and reconciliation architecture

## Ports and adapters

Core domains depend only on ports:

```text
SportsDataProvider   ResultProvider     CustodyProvider
KycProvider          AmlProvider        BlockchainRiskProvider
NotificationProvider GeolocationProvider
```

Adapters translate provider IDs, timestamps, state, errors, and evidence into
internal contracts. Provider payloads never become domain entities directly.
Entity mappings are versioned and support manual review. Failover is allowed
only when alternate mappings are confirmed; uncertainty suspends affected
markets.

## Health

Health service records availability, latency, error rate, freshness, last good
update, mapping failures, rate-limit state, and circuit-breaker state. Policies
define stale thresholds per prematch/live data type. Provider priority and
failover are effective-dated configurations.

## Sports pipeline

```text
licensed feed -> durable raw observation -> authentication/deduplication
-> normalization -> entity mapping -> validation -> internal event revision
-> trading/pricing -> ASTRA price publication -> realtime/outbox
```

Provider odds are inputs; ASTRA published odds are separate versioned records.
Scraping another bookmaker is not a production data strategy. Commercial rights
must cover display, storage, derived pricing, live use, settlement, and audit
retention.

## Reconciliation subsystem

Every run has domain, scope, input watermarks, policy version, status, metrics,
and findings. Findings are immutable evidence with classification and workflow:

```text
OPEN -> INVESTIGATING -> ACTION_APPROVAL? -> CORRECTED -> VERIFIED -> CLOSED
```

Domains:

- ledger vs wallet projection;
- ledger vs deposits/withdrawals and custody/provider/on-chain state;
- bet vs stake reservation;
- confirmed result vs settlements;
- settlement vs payout ledger posting;
- treasury internal records vs provider balances.

Findings identify missing, duplicate, mismatch, stuck, or unexpected state.
They never trigger a hidden balance update. Corrections use normal authorized
commands and compensating ledger entries, followed by a verification run.
