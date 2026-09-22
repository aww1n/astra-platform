# Testing strategy

## Layers

- Unit/property tests: money, odds, rulesets, system combinations, limits,
  settlement, ledger builders, policy composition.
- Database integration: constraints, isolation/races, idempotency, outbox/inbox,
  immutable records, migrations.
- Contract tests: REST/OpenAPI, WebSocket envelopes, provider adapters.
- Component/E2E: Mini App, bot, admin, accessibility, critical journeys.
- Load/soak/chaos: odds/realtime throughput, bet spikes, settlement backlog,
  provider/queue/data-store failure.
- Security: authz matrix, replay, injection, SSRF, CSRF/XSS, dependency/container
  scanning and pre-launch penetration test.

## Mandatory invariant/property suites

- every posted ledger transaction balances per asset;
- no posted entry can mutate or disappear;
- arbitrary valid corrections only add linked transactions;
- payout/rounding is deterministic and never negative/overflowing;
- system-bet combinations match a reference generator and configured caps;
- settlement retry/order/worker crash yields one effective payout;
- one economic chain transfer yields at most one credit;
- available/reserved totals prevent concurrent bet/withdrawal overspend;
- DEMO identifiers can never reference PRODUCTION accounts.

## Financial concurrency scenarios

```text
duplicate deposit/webhook/observer
duplicate bet/cashout/withdrawal click
two bets against one available balance
bet concurrent with withdrawal
two concurrent withdrawals
odds update or market suspension during acceptance
worker crash before and after commit
duplicate outbox delivery
provider timeout after successful withdrawal submission
result correction after payout
withdrawal rejection releases reservation exactly once
deposit reorg and approved reversal
ledger posting failure with no partial domain commit
```

## End-to-end DEMO journey

Telegram auth -> user creation -> demo funding -> sports/live -> quote -> bet ->
reservation -> mock official result -> automatic settlement/payout -> wallet and
history -> notification -> demo withdrawal. Repeat with failure, odds change,
void, half outcome, express/system, and reconnect paths.

## Release gates

CI blocks on formatting/typecheck, unit/integration/contract tests, migrations,
SAST, secrets/dependencies, and image/IaC scans. Staging adds E2E, load smoke,
backup restore, failure injection, and provider sandbox tests. Production launch
requires the separate readiness checklist and external security/compliance work.
