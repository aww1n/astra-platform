#!/usr/bin/env bash
set -euo pipefail

test_root="$(mktemp -d)"
db_port="${ASTRA_TEST_DB_PORT:-55439}"

cleanup() {
  if [[ -f "$test_root/postmaster.pid" ]]; then
    pg_ctl -D "$test_root" -m immediate stop >/dev/null
  fi
  rm -rf "$test_root"
}
trap cleanup EXIT

initdb -D "$test_root" --auth=trust --no-locale --encoding=UTF8 >/dev/null
pg_ctl -D "$test_root" -o "-p $db_port -h 127.0.0.1" -w start >/dev/null
createdb -h 127.0.0.1 -p "$db_port" astra_test
psql -h 127.0.0.1 -p "$db_port" -d astra_test -v ON_ERROR_STOP=1 \
  -f packages/database/migrations/0001_financial_kernel.sql >/dev/null
psql -h 127.0.0.1 -p "$db_port" -d astra_test -v ON_ERROR_STOP=1 \
  -f packages/database/test/financial_kernel.sql >/dev/null

echo "financial kernel database integration tests passed"
