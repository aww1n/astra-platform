# Financial kernel

## Money model

Authoritative amounts use signed integer atomic units represented in TypeScript
as `bigint` and in PostgreSQL as `NUMERIC(78,0)`. A `Money` value is
`{ amountAtomic, assetId }`. Floating point is forbidden in domain calculations.

Each versioned asset policy defines decimals, min/max, stake precision, payout
precision, fee precision, and deterministic rounding. Ledger transactions must
balance independently per asset; there is no cross-asset balancing.

Odds use fixed decimal integers (`oddsMicros`, scale 6). Payout calculations
state their rounding step and policy version explicitly.

## Accounts and projections

Core accounts:

```text
USER_AVAILABLE             USER_BET_RESERVED
USER_WITHDRAWAL_RESERVED   USER_BONUS
OPERATOR_BET_LIABILITY     OPERATOR_BET_REVENUE
OPERATOR_PAYMENT_CLEARING  OPERATOR_ADJUSTMENT
```

Ledger entries are debit/credit postings. Each `POSTED` transaction has at least
two entries and sum(debits) equals sum(credits) per asset. Wallet totals are a
projection; they are never independently editable.

## Invariants

| ID | Invariant |
|---|---|
| INV-FIN-001 | Every posted ledger transaction balances per asset. |
| INV-FIN-002 | Posted transactions and entries are immutable. |
| INV-FIN-003 | Corrections use linked reversal/compensating transactions. |
| INV-FIN-004 | Wallet balances are reproducible from ledger entries. |
| INV-FIN-005 | Authoritative money and odds calculations use no floating point. |
| INV-IDEM-001 | One business operation has at most one effective financial result. |
| INV-BET-001 | Every accepted bet references an immutable acceptance snapshot. |
| INV-BET-002 | Every accepted bet references a ruleset version. |
| INV-BET-003 | Bet creation and stake reservation commit atomically. |
| INV-SET-001 | Snapshot + ruleset + confirmed result settles deterministically. |
| INV-SET-002 | Retry cannot create a duplicate payout. |
| INV-PAY-001 | One economic deposit creates at most one effective credit. |
| INV-WALLET-001 | The same funds cannot be reserved twice. |
| INV-DEMO-001 | DEMO cannot create PRODUCTION ledger entries. |

## Transaction boundaries

Bet acceptance, deposit credit, withdrawal reservation, cashout, settlement,
payout, bonus award, and financial adjustment each execute inside one database
transaction. A typical command does:

```text
BEGIN
claim idempotency key and verify request hash
lock/reload authoritative aggregates
evaluate versioned policy
write domain state
post balanced ledger transaction
append audit record if privileged
append outbox event
store idempotent response
COMMIT
```

External calls do not occur while the database transaction is open. Provider
intent is persisted, committed, then submitted by an idempotent worker.

## Idempotency

`idempotency_keys` is unique on `(environment, scope, actor_id, key)` and stores
request hash, state, result resource, response, and expiry. Reusing a key with a
different hash returns `IDEMPOTENCY_KEY_REUSED`.

Database uniqueness also enforces economic identity: bet client request ID,
settlement `(bet_id, revision)`, payout reference, provider transfer identity,
and withdrawal business ID.

## Outbox and inbox

Domain state and an `outbox_events` row commit together. Publisher claims rows
with `FOR UPDATE SKIP LOCKED`, emits them, and records attempts. Consumers first
claim a unique `(consumer, event_id)` inbox row, perform their local transaction,
then mark it processed. Delivery is at-least-once; effects are exactly-once by
business identity.

Event envelope:

```json
{
  "eventId": "uuid",
  "type": "bet.accepted.v1",
  "aggregateType": "bet",
  "aggregateId": "uuid",
  "aggregateVersion": 4,
  "occurredAt": "RFC3339",
  "correlationId": "uuid",
  "causationId": "uuid",
  "payload": {}
}
```
