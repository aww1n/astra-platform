# Telegram architecture

## Mini App boot

```text
Bot/deep link -> Mini App -> receive initData
-> POST /api/v1/auth/telegram -> backend validates signature and auth_date
-> resolve/create Telegram account and user -> eligibility precheck
-> create ASTRA session -> GET /bootstrap -> Home
```

Validation uses the official Telegram algorithm, compares bytes in constant
time, rejects malformed/expired/replayed payloads, and records safe audit
metadata. The frontend `user` object is display-only. Telegram IDs, roles,
wallets, KYC, restrictions, and referrals are resolved server-side.

Session rules:

- short lifetime with rotation, revocation, device/session listing;
- CSRF protection for cookie sessions;
- strict origins, CSP, no secrets in web storage;
- step-up authentication for sensitive account/payment actions when policy
  requires it;
- logout and security events revoke server-side sessions.

## Bot responsibilities

The bot exposes `/start`, `/help`, `/profile`, `/balance`, `/bets`, and
`/support`, launches the Mini App, receives referral/deep-link tokens, and
delivers safe notifications. It does not calculate odds, balances, or payouts.

Deep links contain short-lived opaque tokens, not authorization. The backend
rechecks ownership and permissions after navigation. Referral attribution is
first-touch/immutable according to a versioned anti-abuse policy.

## Runtime behavior

The Mini App supports Telegram iOS/Android first, then Desktop/Web. It handles
safe areas, theme changes, viewport/keyboard changes, Telegram back button,
resume/reconnect, closing confirmation during a pending action, and REST resync
after realtime gaps. All critical operations expose a pending state and prevent
accidental duplicate submission without relying on UI disabling for safety.
