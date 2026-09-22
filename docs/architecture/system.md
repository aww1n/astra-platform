# System architecture

## Decision

Start as a modular monolith with separately deployable edge, worker, bot,
Mini App, and admin processes. Domain modules communicate in-process through
explicit ports and domain events. PostgreSQL provides atomicity for the
financial kernel. Modules can later be extracted behind the same ports when
measured scale or team ownership justifies it.

This avoids distributed transactions in the highest-risk phase while retaining
clear bounded contexts.

## Trust boundaries

```text
UNTRUSTED                         CONTROLLED                       EXTERNAL
Telegram client / browser
        |
        v
CDN/WAF -> User API gateway -> Auth/Eligibility -> Domain modules -> Providers
                 |                    |                  |             |
                 |                    v                  v             v
                 |               policy store       PostgreSQL     licensed data
                 |                                   Redis/Queue    KYC/custody
                 v
          no direct DB access

Admin browser -> separate origin -> Admin API -> MFA/RBAC -> domain commands
                                                |
                                                v
                                         append-only audit
```

The Mini App, Telegram user fields, WebSocket messages, analytics, Redis,
provider callbacks, and admin-supplied values are never authoritative financial
state.

## Runtime components

```text
Telegram Bot -----+
                  +--> Edge/API --> Modular Domain Core --> PostgreSQL
Mini App ---------+        |               |                   |
                           |               +--> Outbox --------+
Admin App -> Admin API ----+                        |
                                                    v
                                             Workers / BullMQ
                                              |   |   |   |
                                           odds settle notify providers
```

Deployable applications:

- `apps/api`: user REST/WebSocket edge and domain command host.
- `apps/worker`: outbox publisher and asynchronous workers.
- `apps/bot`: Telegram commands, deep links, and notifications entry point.
- `apps/miniapp`: Telegram Mini App.
- `apps/admin`: isolated administration application.

## Bounded contexts

| Context | Owns | May not own |
|---|---|---|
| Identity | users, Telegram accounts, sessions | eligibility decisions |
| Eligibility | jurisdiction/KYC/RG eligibility decisions | customer money |
| Sports | sports, competitions, participants, events | published prices |
| Trading | market catalog, prices, exposure, suspensions | bet money posting |
| Betting | quotes, bets, acceptance snapshots | result truth |
| Settlement | confirmed results, rules execution, revisions | mutable ledger rows |
| Ledger | accounts, transactions, entries | UI wallet state |
| Wallet | projections and reservations orchestration | independent balances |
| Payments | deposits and withdrawals | custody keys |
| Treasury | custody liquidity, signing policies, sweeps | user bet state |
| Compliance | KYC/AML/KYT cases and policies | trading liability |
| Fraud | account/payment/bonus abuse signals | AML disposition |
| Promotions | bonuses, campaigns, referrals | cash ledger mutation |
| Notifications | delivery state | business outcome decisions |
| Support | tickets and dispute links | financial correction |
| Audit | immutable privileged/domain evidence | operational mutation |

Cross-context reads use published query models. Cross-context writes use
commands or durable domain events. No module writes another module's tables.

## Monorepo

```text
apps/
  api/ admin/ bot/ miniapp/ worker/
packages/
  contracts/ database/ domain/ ledger/ money/ observability/
  provider-sdk/ testing/ ui/ validation/
infra/
  docker/ kubernetes/ monitoring/ reverse-proxy/
docs/
  architecture/ api/ database/ operations/ product/ security/ testing/
```

## Data stores

- PostgreSQL: authoritative domain, ledger, audit, inbox, outbox, idempotency.
- Redis: cache, distributed coordination, rate limits, BullMQ transport; never
  authoritative money.
- Object storage: encrypted evidence/exports with retention policy.
- Analytics store: derived, minimised data; never used for decisions.

## Failure philosophy

- Unknown or stale sports state suspends affected markets.
- Unknown financial state blocks the operation and opens reconciliation.
- Side effects happen after commit through outbox consumers.
- Retries are bounded, observable, idempotent, and dead-lettered.
- Kill switches are server-side, RBAC-controlled, versioned, and audited.
