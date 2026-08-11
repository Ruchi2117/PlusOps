import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  MetricAggregation,
  MetricQuerySortField,
  MetricSortDirection
} from "@plusops/contracts";
import {
  metricAggregationValues,
  metricQuerySortFieldValues,
  metricSortDirectionValues
} from "@plusops/contracts";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested
} from "class-validator";

import { MetricLabelDto } from "./metric-label.dto";

export class QueryMetricsDto {
  @ApiPropertyOptional({ example: "http_requests_total", minLength: 2, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z][a-z0-9_:]*$/)
  metricName?: string;

  @ApiPropertyOptional({ example: "5148fb61-6c4c-4214-8546-837958ee8e5f" })
  @IsOptional()
  @IsUUID()
  metricDefinitionId?: string;

  @ApiPropertyOptional({ example: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: "2026-08-11T09:00:00.000Z" })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: "2026-08-11T10:00:00.000Z" })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ type: [MetricLabelDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MetricLabelDto)
  filters?: MetricLabelDto[];

  @ApiPropertyOptional({ example: ["environment", "method"], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(63, { each: true })
  groupBy?: string[];

  @ApiPropertyOptional({ enum: metricAggregationValues, default: "average" })
  @IsOptional()
  @IsIn([...metricAggregationValues])
  aggregation?: MetricAggregation;

  @ApiPropertyOptional({ example: 95, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentile?: number;

  @ApiPropertyOptional({ enum: metricSortDirectionValues, default: "asc" })
  @IsOptional()
  @IsIn([...metricSortDirectionValues])
  sortDirection?: MetricSortDirection;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 100, minimum: 1, maximum: 1000, default: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number;

  @ApiPropertyOptional({ enum: metricQuerySortFieldValues, default: "timestamp" })
  @IsOptional()
  @IsIn([...metricQuerySortFieldValues])
  sortBy?: MetricQuerySortField;

  @ApiPropertyOptional({ example: 100, minimum: 1, maximum: 1000, default: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
