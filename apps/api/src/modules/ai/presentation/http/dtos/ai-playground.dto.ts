import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AIProvider } from "@plusops/contracts";
import { aiProviderValues } from "@plusops/contracts";
import { Type } from "class-transformer";
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

import { AIContextDto } from "./ai-context.dto";

export class AIPlaygroundDto {
  @ApiPropertyOptional({ enum: aiProviderValues })
  @IsOptional()
  @IsIn([...aiProviderValues])
  provider?: AIProvider;

  @ApiProperty({ example: "You are a careful SRE assistant.", maxLength: 8000 })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  systemPrompt!: string;

  @ApiProperty({ example: "Analyze {{service}} reliability risks.", maxLength: 12000 })
  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  userPrompt!: string;

  @ApiPropertyOptional({ example: { service: "Payments API" } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ type: AIContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AIContextDto)
  context?: AIContextDto;
}
