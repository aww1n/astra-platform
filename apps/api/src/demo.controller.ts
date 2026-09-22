import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Post } from "@nestjs/common";
import { CreateQuoteDto, PlaceBetDto } from "./demo.dto.js";
import { DemoService } from "./demo.service.js";

@Controller()
export class DemoController {
  constructor(private readonly demo: DemoService) {}
  private user(value?: string) { return value?.trim() || "demo-user-183729"; }

  @Get("bootstrap") bootstrap(@Headers("x-demo-user") user?: string) { return this.demo.bootstrap(this.user(user)); }
  @Get("events") events() { return { items: this.demo.listEvents() }; }
  @Get("bets") bets(@Headers("x-demo-user") user?: string) { return { items: this.demo.listBets(this.user(user)) }; }
  @Post("bet-quotes") createQuote(@Headers("x-demo-user") user: string | undefined, @Body() body: CreateQuoteDto) { return this.demo.createQuote(this.user(user), body); }
  @Post("bets") @HttpCode(201) placeBet(@Headers("x-demo-user") user: string | undefined, @Headers("idempotency-key") key: string | undefined, @Body() body: PlaceBetDto) {
    if (!key) throw new BadRequestException("IDEMPOTENCY_KEY_REQUIRED");
    return this.demo.placeBet(this.user(user), key, body);
  }
}
