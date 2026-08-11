import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AIProvider } from "@plusops/contracts";
import { aiProviderValues } from "@plusops/contracts";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

import { AIContextDto } from "./ai-context.dto";

export class AIToolDto {
  @ApiPropertyOptional({ enum: aiProviderValues })
  @IsOptional()
  @IsIn([...aiProviderValues])
  provider?: AIProvider;

  @ApiPropertyOptional({ example: "ai.log_analysis.default" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  templateKey?: string;

  @ApiProperty({ example: "ERROR connection refused at payments-db", maxLength: 120000 })
  @IsString()
  @MinLength(1)
  @MaxLength(120000)
  input!: string;

  @ApiPropertyOptional({ type: AIContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AIContextDto)
  context?: AIContextDto;

  @ApiPropertyOptional({ example: { severity: "SEV2" } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}

export class AISqlDto extends AIToolDto {
  @ApiPropertyOptional({ example: "postgresql", default: "postgresql" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  dialect?: string;

  @ApiPropertyOptional({ example: "users(id uuid, email text)", maxLength: 50000 })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  schemaHint?: string;
}

export class AIDocsDto extends AIToolDto {
  @ApiPropertyOptional({ example: "Incidents API" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  apiName?: string;

  @ApiPropertyOptional({ enum: ["markdown", "openapi_summary"], default: "markdown" })
  @IsOptional()
  @IsIn(["markdown", "openapi_summary"])
  format?: "markdown" | "openapi_summary";
}

export class AIReleaseNotesDto {
  @ApiPropertyOptional({ enum: aiProviderValues })
  @IsOptional()
  @IsIn([...aiProviderValues])
  provider?: AIProvider;

  @ApiPropertyOptional({ example: "ai.release_notes.default" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  templateKey?: string;

  @ApiProperty({ example: "v0.9.0" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  version!: string;

  @ApiProperty({ type: [String], example: ["Added AI provider abstraction"] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(2000, { each: true })
  changes!: string[];

  @ApiPropertyOptional({ type: AIContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AIContextDto)
  context?: AIContextDto;

  @ApiPropertyOptional({ example: { audience: "engineering" } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
