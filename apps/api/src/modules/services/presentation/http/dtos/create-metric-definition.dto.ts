import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateMetricDefinitionRequest,
  MetricAggregation,
  MetricType,
  MetricUnit
} from "@plusops/contracts";
import { metricAggregationValues, metricTypeValues, metricUnitValues } from "@plusops/contracts";
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

export class CreateMetricDefinitionDto implements CreateMetricDefinitionRequest {
  @ApiProperty({ example: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4" })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ example: "http_requests_total", minLength: 2, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z][a-z0-9_:]*$/)
  name!: string;

  @ApiProperty({ example: "HTTP Requests Total", minLength: 2, maxLength: 160 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  displayName!: string;

  @ApiPropertyOptional({ example: "Total inbound HTTP requests.", maxLength: 1000 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: metricTypeValues, example: "counter" })
  @IsIn([...metricTypeValues])
  type!: MetricType;

  @ApiProperty({ enum: metricUnitValues, example: "requests" })
  @IsIn([...metricUnitValues])
  unit!: MetricUnit;

  @ApiPropertyOptional({ example: "widgets", maxLength: 40 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customUnit?: string;

  @ApiProperty({ enum: metricAggregationValues, example: "rate" })
  @IsIn([...metricAggregationValues])
  defaultAggregation!: MetricAggregation;

  @ApiPropertyOptional({ example: "74fcfc0c-d6d2-4e72-89c8-aeba56743d03" })
  @IsOptional()
  @IsUUID()
  retentionPolicyId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
