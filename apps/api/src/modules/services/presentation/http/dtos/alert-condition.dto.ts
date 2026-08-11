import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { MetricAggregation } from "@plusops/contracts";
import { metricAggregationValues } from "@plusops/contracts";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
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

import { AlertThresholdDto } from "./alert-threshold.dto";
import { MetricLabelDto } from "./metric-label.dto";

export class AlertConditionDto {
  @ApiPropertyOptional({ example: "http_request_duration_ms", minLength: 2, maxLength: 120 })
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

  @ApiPropertyOptional({ type: [MetricLabelDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MetricLabelDto)
  filters?: MetricLabelDto[];

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

  @ApiPropertyOptional({ example: 3600, minimum: 60, maximum: 2592000, default: 3600 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2_592_000)
  evaluationWindowSeconds?: number;

  @ApiProperty({ type: AlertThresholdDto })
  @ValidateNested()
  @Type(() => AlertThresholdDto)
  threshold!: AlertThresholdDto;
}
