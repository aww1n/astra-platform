# Eligibility, risk, fraud, and compliance

These modules return decisions; they do not silently mutate financial state.
Policies are versioned, effective-dated, jurisdiction-scoped, explainable with
machine-readable reason codes, and auditable.

## Eligibility orchestration

`EligibilityService` combines account status, age, jurisdiction/geo signals,
KYC, sanctions, responsible-gambling restrictions, product eligibility, and
account restrictions. It returns `ALLOW`, `DENY`, or `REVIEW`, policy version,
safe reason codes, and evidence references.

Geo decisions may combine account jurisdiction, permitted IP-derived/provider
location, proxy/VPN/Tor risk, and payment-jurisdiction consistency. A frontend
flag is never proof. Exact rules remain disabled/unconfigured until legal review
for the chosen market.

## Separated decision domains

- Trading risk: exposure, liability, stake/payout limits, price/market control.
- Fraud risk: multi-accounting, ATO, device/account linkage, velocity, referral
  and bonus abuse, payment anomalies.
- AML monitoring: financial crime scenarios, sanctions/PEP, case workflow,
  transaction and blockchain risk monitoring.
- Responsible gambling: deposit/loss/bet/session limits, cooling-off,
  self-exclusion, user protection interventions.
- Eligibility: orchestrates the decisive precondition checks.

Fraud does not replace AML; trading risk does not decide KYC; support cannot
override self-exclusion or sanctions.

## Risk decision evidence

Critical decisions store type, subject/action, policy version, canonical input
hash, result, internal and public reason codes, applied limits, evidence refs,
timestamp, and correlation ID. Sensitive internal reasons are never sent to the
player.

Trading exposure models mutually exclusive outcomes and correlated legs rather
than simply summing stakes. Limit precedence is explicit:

```text
global -> jurisdiction -> product -> sport -> competition -> event
-> market -> selection -> user segment -> user -> action-specific minimum
```

The most restrictive applicable approved limit wins unless a documented policy
defines another composition.

## KYC/AML/KYT cases

Provider adapters normalize external state, but internal state machines remain
authoritative. Cases retain provider references/evidence under a classified
retention policy. Provider unavailability produces `REVIEW` or safe suspension,
never a bypass.

## Responsible-gambling temporal rules

Every change stores previous/new value, requested/effective/expiry time, source,
policy version, and reason. Restrictive changes can be immediate; limit increases
respect jurisdiction-specific cooling periods. Self-exclusion is enforced by
the backend across betting, promotions, and withdrawals according to approved
law/policy and cannot be reversed through ordinary admin tooling.

## Compliance non-bypass

There is no hidden bypass for age, self-exclusion, sanctions, mandatory KYC,
geographic restrictions, or AML/KYT blocks. Legitimate exceptional workflows
must be explicit, permissioned, reasoned, audited, independently approved when
required, and time-bounded.
