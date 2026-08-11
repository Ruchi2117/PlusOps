import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested
} from "class-validator";

import { MetricLabelDto } from "./metric-label.dto";

export class SubmitMetricSampleDto {
  @ApiPropertyOptional({ example: "2026-08-11T10:00:00.000Z" })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({ example: 42 })
  @IsNumber()
  value!: number;

  @ApiPropertyOptional({ type: [MetricLabelDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MetricLabelDto)
  labels?: MetricLabelDto[];

  @ApiPropertyOptional({ example: "manual", maxLength: 120, default: "manual" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;

  @ApiPropertyOptional({
    example: "74fcfc0c-d6d2-4e72-89c8-aeba56743d03",
    nullable: true
  })
  @IsOptional()
  @IsUUID()
  retentionPolicyId?: string | null;
}
