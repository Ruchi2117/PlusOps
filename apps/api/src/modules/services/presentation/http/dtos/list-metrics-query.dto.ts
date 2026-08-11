import { ApiPropertyOptional } from "@nestjs/swagger";
import type { MetricSortDirection, MetricSortField, MetricType } from "@plusops/contracts";
import {
  metricSortDirectionValues,
  metricSortFieldValues,
  metricTypeValues
} from "@plusops/contracts";
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

export class ListMetricsQueryDto {
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

  @ApiPropertyOptional({ example: "request", maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ example: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ enum: metricTypeValues })
  @IsOptional()
  @IsIn([...metricTypeValues])
  type?: MetricType;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ enum: metricSortFieldValues, default: "name" })
  @IsOptional()
  @IsIn([...metricSortFieldValues])
  sortBy?: MetricSortField;

  @ApiPropertyOptional({ enum: metricSortDirectionValues, default: "asc" })
  @IsOptional()
  @IsIn([...metricSortDirectionValues])
  sortDirection?: MetricSortDirection;
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
