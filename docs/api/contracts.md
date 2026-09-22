# API and realtime contracts

Base path: `/api/v1`. JSON timestamps are UTC RFC3339. IDs are opaque strings.
Money is `{ "amountAtomic": "1000000", "asset": "USDT" }`; integer values
are strings when they may exceed JavaScript safe integer range.

Every response includes `X-Request-Id`. Money-moving POST endpoints require
`Idempotency-Key`. Authentication uses a short-lived, httpOnly secure session
cookie or proof-bound bearer token selected during implementation review.

## Error envelope

```json
{
  "error": {
    "code": "ODDS_CHANGED",
    "message": "Odds changed",
    "requestId": "01...",
    "details": { "quoteId": "...", "replacementQuoteId": "..." }
  }
}
```

Messages are localized by the client; decisions use stable codes. Sensitive
risk/compliance reasons are mapped to safe public reason codes.

## Player API

```text
POST /auth/telegram                 validate initData and create session
POST /auth/refresh                  rotate session
POST /auth/logout                   revoke session
GET  /bootstrap                     user-safe initial state and feature flags

GET  /sports                        catalog
GET  /competitions                  filtered/paginated competitions
GET  /events                        event list
GET  /events/{id}                   authoritative event snapshot
GET  /events/{id}/markets           paginated market snapshot
GET  /search                        teams/events/competitions
PUT  /favorites/{type}/{id}         add favorite
DELETE /favorites/{type}/{id}       remove favorite

POST /bet-quotes                    quote selections and stake
POST /bets                          accept exact quote
GET  /bets                          active/history
GET  /bets/{id}                     bet evidence visible to owner
POST /bets/{id}/cashout-quotes      request expiring cashout quote
POST /bets/{id}/cashouts            accept exact cashout quote

GET  /wallet                        ledger-derived projection
GET  /wallet/transactions           cursor-paginated public transactions
GET  /wallet/crypto/assets          enabled rails
POST /wallet/deposits               create address/invoice
GET  /wallet/deposits/{id}          owned deposit status
POST /wallet/withdrawals            reserve funds and create withdrawal
GET  /wallet/withdrawals/{id}       owned withdrawal status

GET/PUT /profile                    safe profile/preferences
GET/POST /responsible-gambling/*    limits, cooling off, self-exclusion
GET/POST /support/tickets           support workflow
GET  /notifications                 notification inbox
POST /notifications/{id}/read       mark read
```

`POST /bets` includes `quoteId`, `clientRequestId`, and explicit odds-change
preference. The server reloads every authoritative entity and never trusts
client payout, balance, eligibility, or odds values.

## Provider webhooks

Provider-specific endpoints live under `/webhooks/v1/{provider}`. Handlers
authenticate/signature-check, apply freshness/replay checks, persist encrypted
raw evidence, deduplicate, return quickly, and process asynchronously. A webhook
never directly edits a balance.

## Admin API

Separate origin and namespace `/admin/api/v1`; MFA and explicit permissions are
required. Sensitive writes create approval requests where policy requires.

```text
GET  /users /bets /payments /settlements /risk /audit
POST /markets/{id}/suspend
POST /kill-switches/{key}/versions
POST /settlements/{id}/review
POST /result-corrections
POST /financial-adjustments
POST /withdrawals/{id}/approval-requests
POST /approvals/{id}/decisions
POST /reconciliation-runs
```

No endpoint accepts a replacement balance or mutates posted financial history.

## WebSocket

Client connects to `/realtime/v1`, authenticates the session, and subscribes to
public event channels plus its private user channel. Envelope:

```json
{
  "eventId": "01...",
  "type": "odds.updated.v1",
  "channel": "event:01...",
  "sequence": 9281,
  "aggregateVersion": 44,
  "occurredAt": "2026-01-01T00:00:00Z",
  "payload": {}
}
```

Sequence gaps force a REST snapshot before resubscription. WebSocket data may
drive display but never confirms a financial outcome. Private channels are
authorization-checked on subscribe and periodically thereafter. Backpressure
causes disconnect with a resumable cursor, not silent unbounded buffering.

Public event types include score, clock, market, odds, and suspension updates.
Private types include bet status, wallet projection version, deposit/withdrawal
status, notification, and restriction changes.
