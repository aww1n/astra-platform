# Observability and SLO architecture

Structured logs, metrics, traces, and audit are separate signals linked by
request, correlation, causation, aggregate, and trace IDs. Logs exclude secrets,
raw credentials, signing data, and unnecessary PII.

## Business and correctness signals

```text
ledger_posting_failures_total
unbalanced_transaction_attempts_total
wallet_projection_lag_seconds
reconciliation_open_findings{domain,severity}
bet_acceptance_total{result,reason}
odds_freshness_seconds{provider,sport,live}
provider_error_rate / provider_mapping_failures
queue_lag_seconds / dead_letter_count
settlement_lag_seconds / oldest_unsettled_finished_event_seconds
duplicate_effect_prevented_total{operation}
deposit_confirmation_age / withdrawal_processing_age
webhook_verification_failures / notification_failures
admin_privileged_actions / approval_age_seconds
```

Dashboards: financial integrity, betting/trading, providers, payments/treasury,
settlement, security/compliance, and platform health. Alerts reference runbooks
and avoid leaking user data.

SLIs include availability, correct/successful bet acceptance, price freshness,
settlement latency, projection freshness, and provider health. Numerical SLOs
are set only after capacity and business requirements are approved; financial
correctness has no error-budget tradeoff.

Distributed traces cover API -> DB transaction -> outbox -> worker -> provider,
with sampling rules that preserve errors and financial flows without recording
sensitive payloads.
