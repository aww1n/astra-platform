# Security policy

ASTRA is currently a STAGING/MOCK implementation. Real-money functionality is not supported by this repository state.

## Reporting

Do not open public issues containing exploit details, credentials, personal data, payment information, or custody material. Report privately to the project owner with the affected component, impact, reproduction steps, and suggested mitigation.

## Secrets and financial safety

- Never commit `.env`, API keys, bot tokens, private keys, seeds, or signing material.
- Use sandbox credentials locally and a managed secret store in production.
- Keep `PRODUCTION_REAL_MONEY=false` until every readiness gate is verified.
- MOCK providers must never be accepted in production.
- Corrections use auditable reversal/compensating ledger transactions.
- Suspected inconsistencies require suspending affected operations and reconciliation.
