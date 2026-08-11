import { ApiPropertyOptional } from "@nestjs/swagger";
import type { AlertSeverity, AlertState } from "@plusops/contracts";
import { alertSeverityValues, alertStateValues } from "@plusops/contracts";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from "class-validator";

export class ListAlertsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ example: "latency", maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: alertStateValues })
  @IsOptional()
  @IsIn([...alertStateValues])
  state?: AlertState;

  @ApiPropertyOptional({ enum: alertSeverityValues })
  @IsOptional()
  @IsIn([...alertSeverityValues])
  severity?: AlertSeverity;

  @ApiPropertyOptional({ example: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;
}

function transformOptionalBoolean(value: unknown): unknown {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}
