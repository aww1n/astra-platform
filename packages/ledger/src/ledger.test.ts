import assert from "node:assert/strict";
import test from "node:test";
import { assetId } from "@astra/money";
import { assertBalanced, createBalancedDraft } from "./index.js";

const USDT = assetId("USDT");

test("accepts a balanced same-asset transaction", () => {
  const draft = createBalancedDraft({
    businessReference: "bet:123:reserve",
    type: "BET_STAKE_RESERVED",
    entries: [
      { accountId: "user:available", assetId: USDT, side: "DEBIT", amountAtomic: 100n },
      { accountId: "user:bet-reserved", assetId: USDT, side: "CREDIT", amountAtomic: 100n },
    ],
  });
  assert.equal(draft.entries.length, 2);
});

test("rejects an unbalanced transaction", () => {
  assert.throws(
    () =>
      assertBalanced({
        businessReference: "broken",
        type: "BROKEN",
        entries: [
          { accountId: "a", assetId: USDT, side: "DEBIT", amountAtomic: 100n },
          { accountId: "b", assetId: USDT, side: "CREDIT", amountAtomic: 99n },
        ],
      }),
    /Unbalanced transaction/,
  );
});

test("rejects zero and negative entries", () => {
  assert.throws(
    () =>
      assertBalanced({
        businessReference: "zero",
        type: "BROKEN",
        entries: [
          { accountId: "a", assetId: USDT, side: "DEBIT", amountAtomic: 0n },
          { accountId: "b", assetId: USDT, side: "CREDIT", amountAtomic: 0n },
        ],
      }),
    /positive/,
  );
});

test("does not allow one asset to cover another", () => {
  const BTC = assetId("BTC");
  assert.throws(() =>
    assertBalanced({
      businessReference: "cross-asset",
      type: "BROKEN",
      entries: [
        { accountId: "a", assetId: USDT, side: "DEBIT", amountAtomic: 100n },
        { accountId: "b", assetId: BTC, side: "CREDIT", amountAtomic: 100n },
      ],
    }),
  );
});
