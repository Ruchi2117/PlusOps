import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class UpdateAIProviderDto {
  @ApiPropertyOptional({ example: "OpenAI" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ example: "gpt-4.1-mini" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional({ example: 4096, minimum: 1, maximum: 200000 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200000)
  maxTokens?: number;

  @ApiPropertyOptional({ example: 0.2, minimum: 0, maximum: 2 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({ example: 0.005, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPer1KInputTokens?: number;

  @ApiPropertyOptional({ example: 0.015, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPer1KOutputTokens?: number;
}
