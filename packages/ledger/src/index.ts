import type { AssetId } from "@astra/money";

export type LedgerSide = "DEBIT" | "CREDIT";

export interface LedgerEntryDraft {
  readonly accountId: string;
  readonly assetId: AssetId;
  readonly side: LedgerSide;
  readonly amountAtomic: bigint;
}

export interface LedgerTransactionDraft {
  readonly businessReference: string;
  readonly type: string;
  readonly entries: readonly LedgerEntryDraft[];
}

export class LedgerInvariantError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LedgerInvariantError";
  }
}

export function assertBalanced(draft: LedgerTransactionDraft): void {
  if (draft.entries.length < 2) {
    throw new LedgerInvariantError("A ledger transaction requires at least two entries");
  }
  if (!draft.businessReference.trim()) {
    throw new LedgerInvariantError("A business reference is required");
  }

  const totals = new Map<AssetId, { debit: bigint; credit: bigint }>();
  for (const entry of draft.entries) {
    if (entry.amountAtomic <= 0n) {
      throw new LedgerInvariantError("Entry amount must be positive");
    }
    if (!entry.accountId.trim()) {
      throw new LedgerInvariantError("Entry account is required");
    }
    const total = totals.get(entry.assetId) ?? { debit: 0n, credit: 0n };
    total[entry.side === "DEBIT" ? "debit" : "credit"] += entry.amountAtomic;
    totals.set(entry.assetId, total);
  }

  for (const [asset, total] of totals) {
    if (total.debit !== total.credit) {
      throw new LedgerInvariantError(
        `Unbalanced transaction for ${asset}: debits=${total.debit}, credits=${total.credit}`,
      );
    }
  }
}

export function createBalancedDraft(draft: LedgerTransactionDraft): LedgerTransactionDraft {
  assertBalanced(draft);
  return Object.freeze({ ...draft, entries: Object.freeze([...draft.entries]) });
}
