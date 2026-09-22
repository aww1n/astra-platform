# Database ERD

The diagram shows ownership and financial links, not every operational column.
All mutable aggregates include `version`, timestamps, and environment/tenant
scope where applicable. IDs are UUIDv7-compatible.

```mermaid
erDiagram
  USER ||--|| TELEGRAM_ACCOUNT : authenticates
  USER ||--o{ SESSION : has
  USER ||--o{ WALLET : owns
  WALLET ||--o{ LEDGER_ACCOUNT : projects
  LEDGER_TRANSACTION ||--|{ LEDGER_ENTRY : contains
  LEDGER_ACCOUNT ||--o{ LEDGER_ENTRY : posts

  SPORT ||--o{ COMPETITION : contains
  COMPETITION ||--o{ EVENT : schedules
  EVENT ||--o{ MARKET : offers
  MARKET ||--o{ SELECTION : contains
  SELECTION ||--o{ ODDS_VERSION : priced

  USER ||--o{ BET : places
  BET ||--|{ BET_LEG : contains
  BET ||--|| BET_ACCEPTANCE_SNAPSHOT : freezes
  BET_ACCEPTANCE_SNAPSHOT }o--|| RULESET_VERSION : references
  EVENT ||--o{ EVENT_RESULT_REVISION : receives
  BET ||--o{ SETTLEMENT_REVISION : settles
  EVENT_RESULT_REVISION ||--o{ SETTLEMENT_REVISION : drives
  SETTLEMENT_REVISION ||--o| LEDGER_TRANSACTION : pays

  USER ||--o{ DEPOSIT : receives
  USER ||--o{ WITHDRAWAL : requests
  DEPOSIT }o--|| ONCHAIN_TRANSFER : observes
  WITHDRAWAL ||--o| WITHDRAWAL_RESERVATION : reserves
  DEPOSIT ||--o| LEDGER_TRANSACTION : credits
  WITHDRAWAL ||--o{ LEDGER_TRANSACTION : posts

  USER ||--o{ KYC_CASE : subject
  USER ||--o{ RISK_DECISION : evaluated
  USER ||--o{ RG_LIMIT : protected
  ADMIN_USER ||--o{ APPROVAL_REQUEST : acts
  APPROVAL_REQUEST ||--o{ APPROVAL_DECISION : receives
  AUDIT_RECORD }o--|| ADMIN_USER : attributes

  IDEMPOTENCY_KEY }o--o| BET : resolves
  OUTBOX_EVENT }o--o| BET : publishes
  INBOX_EVENT }o--o| OUTBOX_EVENT : consumes
```

## Mandatory database controls

- Deferred constraint trigger validates balanced ledger transactions before
  `POSTED` state; application validation is not sufficient.
- Trigger rejects update/delete of posted ledger transactions and entries.
- Partial unique indexes prevent duplicate effective settlement/payout/credit.
- Foreign keys prevent snapshots and rulesets from disappearing.
- Production roles do not have direct table access from clients/admin UI.
- Partition high-volume odds, audit, webhook, and ledger-entry tables only after
  access patterns are measured; correctness constraints remain global.

## Core tables

```text
identity: users, telegram_accounts, sessions, user_restrictions
sports: sports, competitions, participants, events, provider_mappings
trading: markets, selections, odds_versions, price_publications, suspensions
betting: bet_quotes, bets, bet_legs, bet_acceptance_snapshots, ruleset_versions
settlement: event_result_revisions, settlement_runs, settlement_revisions
finance: assets, wallets, ledger_accounts, ledger_transactions, ledger_entries
payments: asset_networks, deposit_addresses, onchain_transfers, deposits,
          withdrawals, withdrawal_reservations, provider_webhook_events
control: idempotency_keys, outbox_events, inbox_events, audit_records,
         approval_requests, approval_decisions, reconciliation_runs/findings
compliance: kyc_cases, aml_cases, risk_decisions, rg_limits, policy_versions
```
