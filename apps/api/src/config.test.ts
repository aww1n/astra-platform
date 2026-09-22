import assert from "node:assert/strict";
import test from "node:test";
import { loadRuntimeConfig } from "./config.js";

test("local mock configuration keeps real money disabled", () => {
  const config = loadRuntimeConfig({ INTEGRATION_MODE: "MOCK", FINANCIAL_MODE: "STAGING", PRODUCTION_REAL_MONEY: "false" });
  assert.equal(config.productionRealMoney, false);
});

test("mock providers can never enable production real money", () => {
  assert.throws(
    () => loadRuntimeConfig({ INTEGRATION_MODE: "MOCK", FINANCIAL_MODE: "PRODUCTION", PRODUCTION_REAL_MONEY: "true" }),
    /cannot use MOCK/,
  );
});
