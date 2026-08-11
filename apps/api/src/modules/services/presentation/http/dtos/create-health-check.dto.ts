import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { CreateHealthCheckRequest, HealthCheckType } from "@plusops/contracts";
import { healthCheckTypeValues } from "@plusops/contracts";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf
} from "class-validator";

export class CreateHealthCheckDto implements CreateHealthCheckRequest {
  @ApiProperty({ example: "Production readiness probe", minLength: 2, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: healthCheckTypeValues, example: "http_endpoint" })
  @IsIn([...healthCheckTypeValues])
  type!: HealthCheckType;

  @ApiPropertyOptional({ example: "https://api.plusops.dev/ready", maxLength: 500 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  target?: string;

  @ApiPropertyOptional({
    example: "Checks whether the service should receive traffic.",
    maxLength: 1000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 60, minimum: 10, maximum: 86400, default: 60 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(86_400)
  intervalSeconds?: number;

  @ApiPropertyOptional({ example: 5000, minimum: 100, maximum: 120000, default: 5000 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(120_000)
  timeoutMs?: number;

  @ApiPropertyOptional({ example: 300, minimum: 10, maximum: 604800 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(604_800)
  staleAfterSeconds?: number;

  @ApiPropertyOptional({
    example: { method: "GET", expectedStatus: 200 },
    type: Object
  })
  @ValidateIf((dto: CreateHealthCheckDto) => dto.configuration !== undefined)
  @IsObject()
  configuration?: Record<string, unknown>;
}
