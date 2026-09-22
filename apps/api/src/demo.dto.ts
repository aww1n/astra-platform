import { IsArray, IsIn, IsNumber, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class QuoteSelectionDto {
  @IsString() eventId!: string;
  @IsString() selectionId!: string;
  @IsString() oddsVersion!: string;
}

export class CreateQuoteDto {
  @IsIn(["SINGLE", "EXPRESS"]) type!: "SINGLE" | "EXPRESS";
  @IsNumber() @Min(1) stake!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => QuoteSelectionDto)
  selections!: QuoteSelectionDto[];
}

export class PlaceBetDto {
  @IsString() quoteId!: string;
  @IsString() clientRequestId!: string;
}
