# Security architecture and threat model

## Controls by boundary

- Edge: TLS, WAF/rate limiting, request-size limits, origin/CORS policy, bot and
  abuse detection, request IDs.
- User API: Telegram signature verification, server session, object-level auth,
  schema validation, idempotency, safe errors.
- Admin API: separate origin, MFA/SSO, RBAC, maker-checker, step-up, audit.
- Data: private network, least-privilege roles, encryption, classified logging,
  backups and PITR.
- Providers: allowlisted egress, scoped/rotated secrets, signatures, freshness,
  replay defense, circuit breakers.
- Supply chain: lockfiles, SAST, secret/dependency/container/IaC scanning,
  signed artifacts and protected deployment environments.
- Custody: isolated signing, policy engine, destination/amount controls, no keys
  in application DB, logs, source, images, CI, or `.env`.

Production secrets use a secret manager/KMS with versioning, audit, rotation,
least privilege, and emergency revocation.

## Threat register

| Threat | Prevention | Detection/response | Required test |
|---|---|---|---|
| Double spend/race | row/advisory locks, atomic reservations, constraints | ledger/reconciliation alert | concurrent bet+withdrawal |
| Duplicate payout | economic unique key, idempotent settlement | duplicate finding, kill switch | crash before/after commit |
| Forged/replayed webhook | signature, freshness, raw inbox, uniqueness | quarantine/security event | invalid/duplicate webhook |
| Stale/manipulated odds | versions, freshness policy, acceptance reload | provider health, suspend | update during acceptance |
| Result manipulation | authorized sources, evidence, revisions, maker-checker | conflict review, audit | conflicting/corrected result |
| Account takeover | session controls, step-up, anomaly detection | security alert/revocation | stolen/expired session |
| Admin abuse | least privilege, segregation, approvals | tamper-evident audit | maker equals checker |
| Injection/XSS | typed queries, validation, output encoding, CSP | WAF/SAST/DAST | malicious payload suite |
| SSRF | egress allowlist, URL parsing, metadata blocking | egress logs | private/redirect targets |
| Secret leakage | KMS, scanning, redaction | leak alert/rotation runbook | seeded secret scan |
| Queue poisoning | authenticated transport, schema/version validation | DLQ and anomaly alert | malformed event |
| DEMO/PROD crossing | separate infra/credentials and DB constraints | invariant monitor | cross-environment IDs |
| Custody compromise | isolated signing/policies/limits | freeze and incident runbook | unauthorized destination |

## Data classification

`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, and `RESTRICTED`. KYC identity, AML cases,
auth secrets, custody/payment credentials, and sensitive financial identifiers
are `RESTRICTED`. A jurisdiction-approved retention matrix controls collection,
encryption, masking, access, deletion/anonymisation, and legal holds.

## Kill switches

Server-side, versioned, RBAC-controlled and audited: disable all/live betting,
suspend event/market/provider, disable deposits/withdrawals/asset/network,
disable payment provider, and maintenance mode. Fail-safe behavior is specified
and tested; client flags cannot override them.

## Incident response

P0–P3 runbooks cover ledger inconsistency, duplicate payout suspicion, stale
odds, provider/payment/KYC/Telegram outages, DB/Redis/queue failure, credential
compromise, and security incidents. P0/P1 includes containment/kill switches,
evidence preservation, escalation, recovery, reconciliation, communication, and
postmortem.
