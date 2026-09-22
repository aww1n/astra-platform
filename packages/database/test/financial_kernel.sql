\set ON_ERROR_STOP on

INSERT INTO astra.assets(id, decimals, minimum_atomic, maximum_atomic, policy_version, enabled)
VALUES ('USDT', 6, 0, 1000000000000000, 1, true);

INSERT INTO astra.ledger_accounts(id, environment, owner_type, owner_id, account_type, asset_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'DEMO', 'USER', '00000000-0000-0000-0000-000000000101', 'USER_AVAILABLE', 'USDT'),
  ('00000000-0000-0000-0000-000000000002', 'DEMO', 'USER', '00000000-0000-0000-0000-000000000101', 'USER_BET_RESERVED', 'USDT');

BEGIN;
INSERT INTO astra.ledger_transactions(
  id, environment, business_reference, transaction_type, correlation_id
) VALUES (
  '00000000-0000-0000-0000-000000001001', 'DEMO', 'bet:1:reserve',
  'BET_STAKE_RESERVED', '00000000-0000-0000-0000-000000009001'
);
INSERT INTO astra.ledger_entries(
  id, transaction_id, environment, account_id, asset_id, side, amount_atomic, entry_order
) VALUES
  ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000001001', 'DEMO', '00000000-0000-0000-0000-000000000001', 'USDT', 'DEBIT', 100000000, 0),
  ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000001001', 'DEMO', '00000000-0000-0000-0000-000000000002', 'USDT', 'CREDIT', 100000000, 1);
UPDATE astra.ledger_transactions
SET status = 'POSTED', posted_at = clock_timestamp()
WHERE id = '00000000-0000-0000-0000-000000001001';
COMMIT;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    UPDATE astra.ledger_entries
    SET amount_atomic = 1
    WHERE id = '00000000-0000-0000-0000-000000002001';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'posted entry mutation was not rejected'; END IF;
END;
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO astra.ledger_transactions(
      id, environment, business_reference, transaction_type, status, correlation_id, posted_at
    ) VALUES (
      '00000000-0000-0000-0000-000000001002', 'DEMO', 'broken:1', 'BROKEN', 'POSTED',
      '00000000-0000-0000-0000-000000009002', clock_timestamp()
    );
    SET CONSTRAINTS ALL IMMEDIATE;
  EXCEPTION WHEN check_violation THEN
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'unbalanced posted transaction was not rejected'; END IF;
END;
$$;

DO $$
BEGIN
  IF (SELECT count(*) FROM astra.ledger_transactions WHERE status = 'POSTED') <> 1 THEN
    RAISE EXCEPTION 'unexpected posted transaction count';
  END IF;
END;
$$;

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    INSERT INTO astra.ledger_entries(
      id, transaction_id, environment, account_id, asset_id, side, amount_atomic, entry_order
    ) VALUES (
      '00000000-0000-0000-0000-000000002099',
      '00000000-0000-0000-0000-000000001001',
      'PRODUCTION',
      '00000000-0000-0000-0000-000000000001',
      'USDT', 'DEBIT', 1, 9
    );
  EXCEPTION WHEN foreign_key_violation THEN
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'cross-environment ledger link was not rejected'; END IF;
END;
$$;

SELECT astra.claim_idempotency_key(
  'DEMO', 'bet.place', 'user:1', 'request-1', repeat('a', 64), clock_timestamp() + interval '1 day'
);
SELECT astra.complete_idempotency_key(
  'DEMO', 'bet.place', 'user:1', 'request-1', repeat('a', 64),
  'bet', '00000000-0000-0000-0000-000000004001', 201, '{"id":"bet-1"}'::jsonb
);

DO $$
DECLARE
  failed boolean := false;
BEGIN
  BEGIN
    PERFORM astra.claim_idempotency_key(
      'DEMO', 'bet.place', 'user:1', 'request-1', repeat('b', 64),
      clock_timestamp() + interval '1 day'
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'idempotency payload mismatch was not rejected'; END IF;
END;
$$;

INSERT INTO astra.outbox_events(
  id, environment, event_type, aggregate_type, aggregate_id, aggregate_version,
  correlation_id, payload
) VALUES (
  '00000000-0000-0000-0000-000000005001', 'DEMO', 'bet.accepted.v1', 'bet',
  '00000000-0000-0000-0000-000000004001', 1,
  '00000000-0000-0000-0000-000000009001', '{"betId":"bet-1"}'::jsonb
);

DO $$
DECLARE
  claimed_count integer;
  claimed_attempts integer;
BEGIN
  SELECT count(*), max(attempts) INTO claimed_count, claimed_attempts
  FROM astra.claim_outbox_events('DEMO', 10);
  IF claimed_count <> 1 OR claimed_attempts <> 1 THEN
    RAISE EXCEPTION 'outbox event was not claimed exactly once';
  END IF;
END;
$$;
