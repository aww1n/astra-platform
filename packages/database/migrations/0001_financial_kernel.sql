BEGIN;

CREATE SCHEMA IF NOT EXISTS astra;

CREATE TYPE astra.environment AS ENUM ('DEMO', 'PRODUCTION');
CREATE TYPE astra.ledger_transaction_status AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
CREATE TYPE astra.ledger_side AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE astra.idempotency_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE astra.outbox_status AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'DEAD');

CREATE TABLE astra.assets (
  id text PRIMARY KEY CHECK (id ~ '^[A-Z0-9][A-Z0-9:_-]{1,31}$'),
  decimals smallint NOT NULL CHECK (decimals BETWEEN 0 AND 30),
  minimum_atomic numeric(78, 0) NOT NULL CHECK (minimum_atomic >= 0),
  maximum_atomic numeric(78, 0) NOT NULL CHECK (maximum_atomic >= minimum_atomic),
  policy_version integer NOT NULL CHECK (policy_version > 0),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE astra.ledger_accounts (
  id uuid PRIMARY KEY,
  environment astra.environment NOT NULL,
  owner_type text NOT NULL CHECK (owner_type <> ''),
  owner_id uuid,
  account_type text NOT NULL CHECK (account_type <> ''),
  asset_id text NOT NULL REFERENCES astra.assets(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  closed_at timestamptz,
  UNIQUE (environment, owner_type, owner_id, account_type, asset_id),
  UNIQUE (id, environment, asset_id),
  CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE astra.ledger_transactions (
  id uuid PRIMARY KEY,
  environment astra.environment NOT NULL,
  business_reference text NOT NULL CHECK (business_reference <> ''),
  transaction_type text NOT NULL CHECK (transaction_type <> ''),
  status astra.ledger_transaction_status NOT NULL DEFAULT 'DRAFT',
  reversal_of_id uuid,
  correlation_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  posted_at timestamptz,
  FOREIGN KEY (reversal_of_id) REFERENCES astra.ledger_transactions(id),
  UNIQUE (environment, business_reference),
  UNIQUE (id, environment),
  CHECK (
    (status = 'DRAFT' AND posted_at IS NULL)
    OR (status IN ('POSTED', 'REVERSED') AND posted_at IS NOT NULL)
  ),
  CHECK (reversal_of_id IS NULL OR reversal_of_id <> id),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX ledger_one_reversal_per_transaction
  ON astra.ledger_transactions(environment, reversal_of_id)
  WHERE reversal_of_id IS NOT NULL;

CREATE TABLE astra.ledger_entries (
  id uuid PRIMARY KEY,
  transaction_id uuid NOT NULL,
  environment astra.environment NOT NULL,
  account_id uuid NOT NULL,
  asset_id text NOT NULL,
  side astra.ledger_side NOT NULL,
  amount_atomic numeric(78, 0) NOT NULL CHECK (amount_atomic > 0),
  entry_order smallint NOT NULL CHECK (entry_order >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (transaction_id, environment)
    REFERENCES astra.ledger_transactions(id, environment),
  FOREIGN KEY (account_id, environment, asset_id)
    REFERENCES astra.ledger_accounts(id, environment, asset_id),
  UNIQUE (transaction_id, entry_order)
);

CREATE INDEX ledger_entries_account_order
  ON astra.ledger_entries(account_id, created_at, id);

CREATE FUNCTION astra.assert_ledger_transaction_balanced(target_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  target_status astra.ledger_transaction_status;
  entry_count bigint;
  mismatch_count bigint;
BEGIN
  SELECT status INTO target_status
  FROM astra.ledger_transactions
  WHERE id = target_id;

  IF target_status IS NULL OR target_status = 'DRAFT' THEN
    RETURN;
  END IF;

  SELECT count(*) INTO entry_count
  FROM astra.ledger_entries
  WHERE transaction_id = target_id;

  IF entry_count < 2 THEN
    RAISE EXCEPTION 'ledger transaction % requires at least two entries', target_id
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO mismatch_count
  FROM (
    SELECT asset_id
    FROM astra.ledger_entries
    WHERE transaction_id = target_id
    GROUP BY asset_id
    HAVING sum(amount_atomic) FILTER (WHERE side = 'DEBIT')
         IS DISTINCT FROM
           sum(amount_atomic) FILTER (WHERE side = 'CREDIT')
  ) mismatches;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'ledger transaction % is unbalanced', target_id
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE FUNCTION astra.check_ledger_balance_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM astra.assert_ledger_transaction_balanced(COALESCE(NEW.id, OLD.id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_balance_on_status
AFTER INSERT OR UPDATE OF status ON astra.ledger_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION astra.check_ledger_balance_trigger();

CREATE FUNCTION astra.protect_posted_ledger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_status astra.ledger_transaction_status;
BEGIN
  IF TG_TABLE_NAME = 'ledger_transactions' THEN
    existing_status := OLD.status;
  ELSE
    SELECT status INTO existing_status
    FROM astra.ledger_transactions
    WHERE id = OLD.transaction_id AND environment = OLD.environment;
  END IF;

  IF existing_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'posted ledger history is immutable'
      USING ERRCODE = '55000';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER protect_posted_transaction_update
BEFORE UPDATE OR DELETE ON astra.ledger_transactions
FOR EACH ROW
WHEN (OLD.status IN ('POSTED', 'REVERSED'))
EXECUTE FUNCTION astra.protect_posted_ledger();

CREATE TRIGGER protect_posted_entries_update
BEFORE UPDATE OR DELETE ON astra.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION astra.protect_posted_ledger();

CREATE FUNCTION astra.protect_posted_entries_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_status astra.ledger_transaction_status;
BEGIN
  SELECT status INTO target_status
  FROM astra.ledger_transactions
  WHERE id = NEW.transaction_id AND environment = NEW.environment;
  IF target_status IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'cannot add an entry to posted ledger history'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_posted_entries_insert
BEFORE INSERT ON astra.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION astra.protect_posted_entries_insert();

CREATE TABLE astra.idempotency_keys (
  environment astra.environment NOT NULL,
  scope text NOT NULL CHECK (scope <> ''),
  actor_id text NOT NULL CHECK (actor_id <> ''),
  key text NOT NULL CHECK (key <> ''),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  status astra.idempotency_status NOT NULL DEFAULT 'PROCESSING',
  resource_type text,
  resource_id uuid,
  response_code integer CHECK (response_code BETWEEN 100 AND 599),
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (environment, scope, actor_id, key),
  CHECK (expires_at > created_at),
  CHECK (
    status <> 'COMPLETED'
    OR (response_code IS NOT NULL AND response_body IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE TABLE astra.outbox_events (
  id uuid PRIMARY KEY,
  environment astra.environment NOT NULL,
  event_type text NOT NULL CHECK (event_type ~ '^[a-z0-9_.-]+\.v[1-9][0-9]*$'),
  aggregate_type text NOT NULL CHECK (aggregate_type <> ''),
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL CHECK (aggregate_version > 0),
  correlation_id uuid NOT NULL,
  causation_id uuid,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status astra.outbox_status NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  last_error_code text,
  UNIQUE (environment, aggregate_type, aggregate_id, aggregate_version, event_type)
);

CREATE INDEX outbox_pending_claim
  ON astra.outbox_events(available_at, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE TABLE astra.inbox_events (
  environment astra.environment NOT NULL,
  consumer text NOT NULL CHECK (consumer <> ''),
  event_id uuid NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  processed_at timestamptz,
  last_error_code text,
  PRIMARY KEY (environment, consumer, event_id)
);

CREATE FUNCTION astra.claim_idempotency_key(
  target_environment astra.environment,
  target_scope text,
  target_actor_id text,
  target_key text,
  target_request_hash text,
  target_expires_at timestamptz
)
RETURNS astra.idempotency_keys
LANGUAGE plpgsql
AS $$
DECLARE
  claimed astra.idempotency_keys;
BEGIN
  INSERT INTO astra.idempotency_keys(
    environment, scope, actor_id, key, request_hash, expires_at
  ) VALUES (
    target_environment, target_scope, target_actor_id, target_key,
    target_request_hash, target_expires_at
  )
  ON CONFLICT (environment, scope, actor_id, key) DO NOTHING;

  SELECT * INTO claimed
  FROM astra.idempotency_keys
  WHERE environment = target_environment
    AND scope = target_scope
    AND actor_id = target_actor_id
    AND key = target_key
  FOR UPDATE;

  IF claimed.request_hash <> target_request_hash THEN
    RAISE EXCEPTION 'idempotency key reused with different request hash'
      USING ERRCODE = '22023';
  END IF;

  RETURN claimed;
END;
$$;

CREATE FUNCTION astra.complete_idempotency_key(
  target_environment astra.environment,
  target_scope text,
  target_actor_id text,
  target_key text,
  target_request_hash text,
  target_resource_type text,
  target_resource_id uuid,
  target_response_code integer,
  target_response_body jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE astra.idempotency_keys
  SET status = 'COMPLETED',
      resource_type = target_resource_type,
      resource_id = target_resource_id,
      response_code = target_response_code,
      response_body = target_response_body,
      completed_at = clock_timestamp()
  WHERE environment = target_environment
    AND scope = target_scope
    AND actor_id = target_actor_id
    AND key = target_key
    AND request_hash = target_request_hash
    AND status = 'PROCESSING';

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 1 THEN
    RAISE EXCEPTION 'idempotency key is missing, mismatched, or already final'
      USING ERRCODE = '55000';
  END IF;
END;
$$;

CREATE FUNCTION astra.claim_outbox_events(
  target_environment astra.environment,
  batch_size integer
)
RETURNS SETOF astra.outbox_events
LANGUAGE sql
AS $$
  UPDATE astra.outbox_events event
  SET status = 'PROCESSING', attempts = event.attempts + 1
  FROM (
    SELECT id
    FROM astra.outbox_events
    WHERE environment = target_environment
      AND status = 'PENDING'
      AND available_at <= clock_timestamp()
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(batch_size, 1), 1000)
  ) claimed
  WHERE event.id = claimed.id
  RETURNING event.*;
$$;

CREATE VIEW astra.ledger_account_balances AS
SELECT
  account.id AS account_id,
  account.environment,
  account.asset_id,
  COALESCE(sum(
    CASE
      WHEN transaction.id IS NULL THEN 0
      WHEN entry.side = 'CREDIT' THEN entry.amount_atomic
      ELSE -entry.amount_atomic
    END
  ), 0) AS balance_atomic
FROM astra.ledger_accounts account
LEFT JOIN astra.ledger_entries entry ON entry.account_id = account.id
LEFT JOIN astra.ledger_transactions transaction
  ON transaction.id = entry.transaction_id
  AND transaction.status IN ('POSTED', 'REVERSED')
GROUP BY account.id, account.environment, account.asset_id;

COMMIT;
