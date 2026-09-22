# Payments, custody, and treasury

Production crypto remains disabled until vendor contracts, jurisdiction review,
KYC/AML/KYT ownership, Travel Rule assessment, signing controls, testnet E2E,
reconciliation, and the readiness gate are approved.

## Model

`Asset`, `Network`, and `AssetNetwork` are separate. Each rail versions trusted
contract/master identity, decimals, address/memo rules, enabled directions,
limits, fees, finality, provider mapping, and status. Ticker text is never token
identity; TON Jettons require allowlisted master/wallet validation.

## Deposits

```text
CREATED -> ADDRESS_ASSIGNED -> DETECTED -> VALIDATING -> CONFIRMING
-> COMPLIANCE_REVIEW? -> CREDIT_READY -> CREDITED
```

Exceptional states include wrong asset/network, under/overpayment, late,
expired, reorg review, rejected, and manual review. Webhook/poller observations
converge on a canonical network-specific transfer identity such as network,
transaction hash, transfer/log/message index, asset identity, and destination.

Credit is atomic: claim economic identity, validate trusted rail/finality/KYT,
post balanced ledger transaction, mark credited, emit outbox. Reorgs never
delete history; they open an incident and use approved reversals if required.

## Withdrawals

```text
CREATED -> RESERVED -> VALIDATING -> COMPLIANCE_REVIEW
-> APPROVAL_PENDING? -> APPROVED -> SUBMITTING -> BROADCAST
-> CONFIRMING -> COMPLETED
```

Reservation moves user funds from available to withdrawal-reserved atomically.
Before broadcast the system validates network/address/memo, eligibility,
security state, sanctions/KYT, limits, fees, and treasury liquidity. A provider
timeout triggers lookup by immutable withdrawal ID before any retry. After
broadcast funds are not released without resolving chain/provider state.

## Custody boundary

```text
Wallet/Ledger -> Crypto Orchestrator -> CustodyProvider port
-> institutional custody/signing infrastructure -> networks
```

Application services never possess plaintext private keys, seed phrases, or
mnemonics. Provider selection remains open; technical chain support is not
commercial or regulatory approval for gambling.

## Treasury

Hot/warm/cold operational tiers have versioned min/target/max thresholds,
network gas monitoring, destination/amount policies, emergency freezes, role
separation, and maker-checker for large actions. Sweeps are separate chain
transactions and do not credit the user twice.

Fee quotes show amount, fee, net amount, network, and destination before
confirmation. Actual and charged fees are separately recorded with policy
version. Reconciliation compares provider/on-chain transfers, payment domain,
ledger, wallet projections, and treasury balances.
