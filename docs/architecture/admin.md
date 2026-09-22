# Admin, authorization, and audit

The admin application uses a separate origin and API, MFA, short sessions,
revocation, least-privilege RBAC, optional enterprise SSO, and conditional
IP/device controls. It never connects directly to the production database.

## Roles

Base roles are `SUPER_ADMIN`, `OPERATIONS`, `TRADING`, `RISK_MANAGER`,
`FINANCE`, `KYC_COMPLIANCE`, `SUPPORT`, and `READ_ONLY`. Permissions are granular
actions such as `bets.read`, `markets.suspend`, `withdrawals.approve`,
`results.correct`, `ledger.adjust.request`, and `audit.read_sensitive`.

Access combines role permission, resource scope, environment, segregation of
duties, current MFA/session assurance, and case assignment where relevant.
`SUPER_ADMIN` is not a compliance bypass.

## Maker-checker

Policy selects actions/thresholds requiring independent approval: large
withdrawals, financial adjustments, result corrections, settlement overrides,
treasury actions, and critical configuration/limits.

```text
maker request -> PENDING_APPROVAL -> independent checker decision
-> APPROVED/REJECTED -> idempotent executor -> EXECUTED/FAILED
```

Maker and checker cannot be the same identity. Approval binds the immutable
request hash; any payload change invalidates it. Expiry and quorum are policy
controlled.

## Financial adjustments

Admin submits amount, asset, direction, user/account, reason, ticket/evidence,
and requested effective behavior. Approval produces an ordinary balanced ledger
transaction. There is no balance-edit endpoint. Reversal follows the same
controlled path.

## Audit

Privileged and critical domain actions append records containing actor/type,
role/permission, session, request/trace, action, entity, old/new safe values,
reason, IP/user-agent, evidence, timestamp, previous hash, and record hash.
Sensitive values are masked/classified.

Audit is append-only with restricted writers, periodic signed checkpoints and
export to WORM-compatible storage where required. Hash chaining provides
tamper-evidence but does not replace access control, backups, or external
anchoring.
