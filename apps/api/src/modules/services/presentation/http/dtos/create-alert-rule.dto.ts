import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AlertSeverity } from "@plusops/contracts";
import { alertSeverityValues } from "@plusops/contracts";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

import { AlertConditionDto } from "./alert-condition.dto";

export class CreateAlertRuleDto {
  @ApiProperty({ example: "High API latency", minLength: 2, maxLength: 160 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "Fires when p95 latency is above the SLO.", maxLength: 1000 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: alertSeverityValues, example: "critical" })
  @IsIn([...alertSeverityValues])
  severity!: AlertSeverity;

  @ApiProperty({ type: AlertConditionDto })
  @ValidateNested()
  @Type(() => AlertConditionDto)
  condition!: AlertConditionDto;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: "2026-08-12T10:00:00.000Z", nullable: true })
  @IsOptional()
  @IsDateString()
  mutedUntil?: string | null;
}
