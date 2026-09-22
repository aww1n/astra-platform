# Betting and settlement

## Quote and acceptance

A quote is server-generated, immutable, expiring, and bound to user,
environment, selections, odds versions, stake, currency, bet type, calculated
potential payout, eligibility/risk policy versions, and quote timestamp.

Acceptance transaction:

```text
authenticate -> claim idempotency -> lock user financial scope
-> reload status/eligibility/RG -> reload event/market/selection/odds
-> compare quote and allowed odds-change preference -> limits/risk
-> available funds -> create bet and immutable acceptance snapshot
-> reserve stake through balanced ledger posting -> outbox -> commit
```

If price changes, the server rejects with `ODDS_CHANGED` and a new quote. A new
price is never silently accepted unless a precisely specified user preference
allows only a more favorable change and the policy permits it.

## Acceptance snapshot

The snapshot stores accepted odds per leg, event/market/selection identity and
display labels, provider/source references, bet type, stake, potential payout,
ruleset version, quote, policy/config versions, correlation classification,
acceptance time, and a canonical hash. Later catalog edits cannot change it.

## Rulesets

Rules are versioned by sport, market family, competition/jurisdiction where
needed, and effective interval. They define regulation/overtime scope,
postponement/abandonment, void/push, dead heat, half-win/half-loss, result source,
precision, and correction policy. Accepted bets retain their version forever.

System bets use a deterministic combinations generator with strict caps. Same
event/correlated selections are denied unless an explicit Bet Builder product
has a dedicated pricing/correlation model.

## Lifecycle

```text
CREATED -> VALIDATING -> ACCEPTED -> OPEN -> SETTLEMENT_PENDING -> SETTLED
                     \-> REJECTED
OPEN -> CASHED_OUT | VOID | CANCELLED (only by versioned rule)
```

## Result and settlement

Result policy defines authorized sources, required evidence, source priority,
quorum/conflict behavior, delay windows, and manual-review conditions. Provider
disagreement becomes `RESULT_REVIEW`; uncertainty never triggers payout.

```text
official evidence -> result candidate -> policy validation
-> confirmed immutable result revision -> settlement run
-> deterministic leg outcomes -> bet outcome/payout
-> balanced ledger posting -> settled revision -> outbox -> commit
```

Supported leg outcomes include WIN, LOSS, VOID, PUSH, HALF_WIN, and HALF_LOSS.
Express void rules and system combinations are computed from the accepted
ruleset. Settlement uniqueness on `(bet_id, result_revision_id)` plus payout
reference prevents duplicate economic effects.

## Corrections

Results are never overwritten. A correction creates a new result revision with
evidence, reason, actor, and approval. The system calculates a new settlement
revision, reverses the prior payout via linked ledger transaction, posts the new
outcome, updates projections, notifies the user, and opens reconciliation.

Manual override requires explicit permission, reason, evidence, maker-checker
above policy threshold, and tamper-evident audit.

## Cashout

Cashout uses an expiring server quote bound to current exposure and bet state.
Acceptance locks the bet, revalidates the quote, posts a ledger transaction,
creates a settlement-like immutable record, and closes the relevant exposure.
Provider/pricing failure disables cashout without affecting the original bet.
