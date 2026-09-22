# Telegram Mini App screen map

```text
Bot / deep link
└─ Boot/Auth
   └─ Home
      ├─ Live ─ Event ─ Market ─ Bet slip
      ├─ Sports ─ Competition ─ Event ─ Bet slip
      ├─ Search/Favorites ─ Event
      ├─ My Bets ─ Bet details ─ Cashout
      └─ Profile
         ├─ Wallet ─ Deposit / Withdraw / Transactions
         ├─ KYC
         ├─ Responsible Gambling
         ├─ Bonuses / Referrals
         ├─ Notifications
         ├─ Support ─ Ticket details
         ├─ Security
         └─ Settings
```

Bottom navigation: Home, Sports, Bet Slip, My Bets, Profile. Live is prominent
from Home/Sports. A bet-slip mini bar appears when selections exist and expands
to a full screen/bottom sheet without obscuring navigation or safe areas.

## Critical state contracts

Every data surface implements loading skeleton, empty, recoverable error, stale,
offline, and access-restricted states. Odds buttons implement default, selected,
up/down changed, suspended, closed, loading, and disabled. Market accordions
announce suspension and last update.

Place Bet states:

```text
disabled -> ready -> quoting -> confirmation-required? -> submitting
-> accepted | odds-changed | rejected | uncertain/resync
```

An uncertain network response never claims success/failure; the app resolves by
idempotency key/bet lookup. Deposit and withdrawal flows emphasize asset,
network, address/memo, amount, fee/net, and non-recoverability warnings.

## Visual and accessibility direction

Dark-first, premium, dense but calm, with minimal gradients/glass. Semantic
tokens cover background/surfaces, primary/secondary, success/warning/error/live,
text, borders, focus, and odds movement. Minimum touch target is 44px. Support
screen reader labels, visible focus, reduced motion, contrast, dynamic viewport,
Telegram safe areas, and keyboard navigation on desktop.

Motion communicates selection/update/state and stays short; balance/odds change
is never conveyed by color or animation alone. The UI cannot expose internal
risk rules, secrets, raw provider evidence, or unapproved admin functionality.

## Screen specification checklist

Each screen definition must include purpose, entry/exit, query/commands,
authorization, states, analytics, accessibility, offline/reconnect behavior,
sensitive-data treatment, responsive rules, and test cases.
