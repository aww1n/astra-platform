export type AssetId = string & { readonly __assetId: unique symbol };

export interface Money {
  readonly amountAtomic: bigint;
  readonly assetId: AssetId;
}

export interface AssetPolicy {
  readonly assetId: AssetId;
  readonly decimals: number;
  readonly minimumAtomic: bigint;
  readonly maximumAtomic: bigint;
}

export type RoundingMode = "DOWN" | "UP" | "HALF_UP";

export class MoneyError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

export function assetId(value: string): AssetId {
  if (!/^[A-Z0-9][A-Z0-9:_-]{1,31}$/.test(value)) {
    throw new MoneyError(`Invalid asset id: ${value}`);
  }
  return value as AssetId;
}

export function money(amountAtomic: bigint, id: AssetId): Money {
  return Object.freeze({ amountAtomic, assetId: id });
}

export function assertSameAsset(left: Money, right: Money): void {
  if (left.assetId !== right.assetId) {
    throw new MoneyError(`Asset mismatch: ${left.assetId} vs ${right.assetId}`);
  }
}

export function add(left: Money, right: Money): Money {
  assertSameAsset(left, right);
  return money(left.amountAtomic + right.amountAtomic, left.assetId);
}

export function subtract(left: Money, right: Money): Money {
  assertSameAsset(left, right);
  return money(left.amountAtomic - right.amountAtomic, left.assetId);
}

export function validateMoney(value: Money, policy: AssetPolicy): void {
  if (value.assetId !== policy.assetId) throw new MoneyError("Asset policy mismatch");
  if (value.amountAtomic < policy.minimumAtomic) throw new MoneyError("Amount below minimum");
  if (value.amountAtomic > policy.maximumAtomic) throw new MoneyError("Amount above maximum");
}

export function parseDecimal(value: string, policy: AssetPolicy): Money {
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new MoneyError(`Invalid decimal amount: ${value}`);
  const fraction = match[2] ?? "";
  if (fraction.length > policy.decimals) throw new MoneyError("Too many decimal places");
  const scale = 10n ** BigInt(policy.decimals);
  const whole = BigInt(match[1] ?? "0") * scale;
  const fractional = BigInt(fraction.padEnd(policy.decimals, "0") || "0");
  const result = money(whole + fractional, policy.assetId);
  validateMoney(result, policy);
  return result;
}

export function formatDecimal(value: Money, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 30) {
    throw new MoneyError("Invalid decimal scale");
  }
  const sign = value.amountAtomic < 0n ? "-" : "";
  const absolute = value.amountAtomic < 0n ? -value.amountAtomic : value.amountAtomic;
  const scale = 10n ** BigInt(decimals);
  const whole = absolute / scale;
  if (decimals === 0) return `${sign}${whole}`;
  const fraction = (absolute % scale).toString().padStart(decimals, "0");
  return `${sign}${whole}.${fraction}`;
}

export const ODDS_SCALE = 1_000_000n;
export type DecimalOdds = bigint & { readonly __decimalOdds: unique symbol };

export function decimalOdds(micros: bigint): DecimalOdds {
  if (micros < ODDS_SCALE) throw new MoneyError("Decimal odds must be at least 1.0");
  return micros as DecimalOdds;
}

export function parseDecimalOdds(value: string): DecimalOdds {
  const policy: AssetPolicy = {
    assetId: assetId("ODDS"),
    decimals: 6,
    minimumAtomic: ODDS_SCALE,
    maximumAtomic: 1_000_000n * ODDS_SCALE,
  };
  return decimalOdds(parseDecimal(value, policy).amountAtomic);
}

export function divideRounded(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  if (numerator < 0n || denominator <= 0n) throw new MoneyError("Positive operands required");
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n || mode === "DOWN") return quotient;
  if (mode === "UP") return quotient + 1n;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

export function singlePayout(stake: Money, odds: DecimalOdds, mode: RoundingMode): Money {
  if (stake.amountAtomic < 0n) throw new MoneyError("Stake cannot be negative");
  return money(divideRounded(stake.amountAtomic * odds, ODDS_SCALE, mode), stake.assetId);
}

export function multiplyOdds(values: readonly DecimalOdds[], mode: RoundingMode): DecimalOdds {
  if (values.length === 0) throw new MoneyError("At least one price is required");
  let result = values[0] as bigint;
  for (let index = 1; index < values.length; index += 1) {
    result = divideRounded(result * (values[index] as bigint), ODDS_SCALE, mode);
  }
  return decimalOdds(result);
}
