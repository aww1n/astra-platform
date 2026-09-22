import assert from "node:assert/strict";
import test from "node:test";
import {
  assetId,
  formatDecimal,
  money,
  multiplyOdds,
  parseDecimal,
  parseDecimalOdds,
  singlePayout,
  type AssetPolicy,
} from "./index.js";

const USDT = assetId("USDT");
const policy: AssetPolicy = {
  assetId: USDT,
  decimals: 6,
  minimumAtomic: 0n,
  maximumAtomic: 1_000_000_000_000_000n,
};

test("money parses and formats without floating point", () => {
  const value = parseDecimal("1250.000001", policy);
  assert.equal(value.amountAtomic, 1_250_000_001n);
  assert.equal(formatDecimal(value, 6), "1250.000001");
});

test("money rejects excess precision", () => {
  assert.throws(() => parseDecimal("1.0000001", policy), /decimal places/);
});

test("single payout uses explicit deterministic rounding", () => {
  const stake = money(100_000_000n, USDT);
  assert.equal(singlePayout(stake, parseDecimalOdds("3.18"), "DOWN").amountAtomic, 318_000_000n);
});

test("express prices multiply at fixed precision", () => {
  const odds = multiplyOdds(
    [parseDecimalOdds("1.80"), parseDecimalOdds("2.00"), parseDecimalOdds("1.50")],
    "HALF_UP",
  );
  assert.equal(odds, 5_400_000n);
});
