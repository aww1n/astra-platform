import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { CreateQuoteDto, PlaceBetDto } from "./demo.dto.js";

type Quote = { id: string; userId: string; type: string; stakeAtomic: bigint; totalOddsMicros: bigint; selections: Array<{ eventId: string; selectionId: string; oddsMicros: bigint; oddsVersion: string }>; expiresAt: number };
type Bet = { id: string; userId: string; status: "OPEN"; stakeAtomic: bigint; potentialPayoutAtomic: bigint; totalOddsMicros: bigint; acceptedAt: string; selections: Quote["selections"] };

const events = [
  { id: "evt-real-barca", sport: "football", competition: "La Liga", home: "Real Madrid", away: "Barcelona", live: true, score: "2:1", clock: "67:21", selections: [{ id: "home", name: "П1", odds: "1.650000", version: "12" }, { id: "draw", name: "X", odds: "4.200000", version: "9" }, { id: "away", name: "П2", odds: "5.100000", version: "11" }] },
  { id: "evt-liv-ars", sport: "football", competition: "Premier League", home: "Liverpool", away: "Arsenal", live: true, score: "1:1", clock: "52:08", selections: [{ id: "home", name: "П1", odds: "2.100000", version: "7" }, { id: "draw", name: "X", odds: "3.500000", version: "7" }, { id: "away", name: "П2", odds: "3.200000", version: "8" }] },
];

@Injectable()
export class DemoService {
  private readonly quotes = new Map<string, Quote>();
  private readonly bets = new Map<string, Bet>();
  private readonly idempotency = new Map<string, Bet>();
  private availableAtomic = 1_250_000_000n;
  private reservedAtomic = 250_000_000n;

  bootstrap(userId: string) { return { mode: "DEMO", productionRealMoney: false, user: { id: userId, username: "demo_user", status: "ACTIVE", kyc: "VERIFIED" }, wallet: this.wallet(), features: { live: true, cashout: false, cryptoProduction: false } }; }
  listEvents() { return events; }
  listBets(userId: string) { return [...this.bets.values()].filter(bet => bet.userId === userId).map(this.serializeBet); }

  createQuote(userId: string, input: CreateQuoteDto) {
    if (input.selections.length < 1 || (input.type === "SINGLE" && input.selections.length !== 1)) throw new BadRequestException("INVALID_SELECTION_COUNT");
    const selected = input.selections.map(requested => {
      const event = events.find(item => item.id === requested.eventId);
      const selection = event?.selections.find(item => item.id === requested.selectionId);
      if (!event || !selection) throw new NotFoundException("SELECTION_NOT_FOUND");
      if (selection.version !== requested.oddsVersion) throw new BadRequestException("ODDS_CHANGED");
      return { eventId: event.id, selectionId: selection.id, oddsMicros: BigInt(selection.odds.replace(".", "")), oddsVersion: selection.version };
    });
    const totalOddsMicros = selected.reduce((total, item) => (total * item.oddsMicros) / 1_000_000n, 1_000_000n);
    const quote: Quote = { id: randomUUID(), userId, type: input.type, stakeAtomic: BigInt(Math.round(input.stake * 1_000_000)), totalOddsMicros, selections: selected, expiresAt: Date.now() + 30_000 };
    this.quotes.set(quote.id, quote);
    return { quoteId: quote.id, expiresAt: new Date(quote.expiresAt).toISOString(), stakeAtomic: quote.stakeAtomic.toString(), totalOdds: this.formatOdds(totalOddsMicros), potentialPayoutAtomic: ((quote.stakeAtomic * totalOddsMicros) / 1_000_000n).toString() };
  }

  placeBet(userId: string, key: string, input: PlaceBetDto) {
    const idemKey = `${userId}:${key}`;
    const existing = this.idempotency.get(idemKey);
    if (existing) return this.serializeBet(existing);
    const quote = this.quotes.get(input.quoteId);
    if (!quote || quote.userId !== userId) throw new NotFoundException("QUOTE_NOT_FOUND");
    if (quote.expiresAt < Date.now()) throw new BadRequestException("QUOTE_EXPIRED");
    if (this.availableAtomic < quote.stakeAtomic) throw new BadRequestException("INSUFFICIENT_FUNDS");
    this.availableAtomic -= quote.stakeAtomic;
    this.reservedAtomic += quote.stakeAtomic;
    const bet: Bet = { id: randomUUID(), userId, status: "OPEN", stakeAtomic: quote.stakeAtomic, potentialPayoutAtomic: (quote.stakeAtomic * quote.totalOddsMicros) / 1_000_000n, totalOddsMicros: quote.totalOddsMicros, acceptedAt: new Date().toISOString(), selections: quote.selections };
    this.bets.set(bet.id, bet); this.idempotency.set(idemKey, bet); this.quotes.delete(quote.id);
    return this.serializeBet(bet);
  }

  private wallet() { return { asset: "USDT", availableAtomic: this.availableAtomic.toString(), betReservedAtomic: this.reservedAtomic.toString(), withdrawalReservedAtomic: "0", bonusAtomic: "50000000" }; }
  private formatOdds(value: bigint) { return `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, "0")}`; }
  private readonly serializeBet = (bet: Bet) => ({ id: bet.id, status: bet.status, stakeAtomic: bet.stakeAtomic.toString(), potentialPayoutAtomic: bet.potentialPayoutAtomic.toString(), totalOdds: this.formatOdds(bet.totalOddsMicros), acceptedAt: bet.acceptedAt, selections: bet.selections.map(item => ({ ...item, oddsMicros: item.oddsMicros.toString() })) });
}
