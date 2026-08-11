import { ApiPropertyOptional } from "@nestjs/swagger";
import type {
  MetricAggregation,
  MetricUnit,
  UpdateMetricDefinitionRequest
} from "@plusops/contracts";
import { metricAggregationValues, metricUnitValues } from "@plusops/contracts";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength
} from "class-validator";

export class UpdateMetricDefinitionDto implements UpdateMetricDefinitionRequest {
  @ApiPropertyOptional({ example: "http_requests_total", minLength: 2, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z][a-z0-9_:]*$/)
  name?: string;

  @ApiPropertyOptional({ example: "HTTP Requests Total", minLength: 2, maxLength: 160 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ example: "Total inbound HTTP requests.", maxLength: 1000, nullable: true })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ enum: metricUnitValues, example: "requests" })
  @IsOptional()
  @IsIn([...metricUnitValues])
  unit?: MetricUnit;

  @ApiPropertyOptional({ example: "widgets", maxLength: 40, nullable: true })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customUnit?: string | null;

  @ApiPropertyOptional({ enum: metricAggregationValues, example: "rate" })
  @IsOptional()
  @IsIn([...metricAggregationValues])
  defaultAggregation?: MetricAggregation;

  @ApiPropertyOptional({
    example: "74fcfc0c-d6d2-4e72-89c8-aeba56743d03",
    nullable: true
  })
  @IsOptional()
  @IsUUID()
  retentionPolicyId?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
