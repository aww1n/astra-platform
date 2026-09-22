# Contributing to ASTRA

Thank you for helping improve ASTRA. Changes should preserve the platform's financial, security, and environment-isolation invariants.

## Development workflow

1. Create a focused branch from `main`.
2. Install dependencies with `npm ci`.
3. Make the smallest coherent change.
4. Add or update tests and documentation.
5. Run `npm run check` and `npm audit --omit=dev`.
6. Open a pull request using the repository template.

## Engineering requirements

- Never use floating point for authoritative money or odds calculations.
- Keep money-moving commands atomic and idempotent.
- Never mutate posted ledger history; create compensating entries.
- Treat all Mini App input as untrusted.
- Never mix DEMO and PRODUCTION balances, credentials, infrastructure, or events.
- Never commit `.env`, tokens, private keys, provider credentials, or personal data.
- Document changes to API contracts, migrations, threat boundaries, and operations.

## Commit and pull-request scope

Use clear imperative commit messages. Pull requests should explain the problem, the chosen solution, verification performed, risk, and rollback approach. Large architectural changes should first be described in an issue or design document.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. Follow the private reporting instructions in [SECURITY.md](SECURITY.md).
