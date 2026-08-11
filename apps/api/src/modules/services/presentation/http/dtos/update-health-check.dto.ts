import { ApiPropertyOptional } from "@nestjs/swagger";
import type { HealthCheckType, UpdateHealthCheckRequest } from "@plusops/contracts";
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

export class UpdateHealthCheckDto implements UpdateHealthCheckRequest {
  @ApiPropertyOptional({ example: "Production readiness probe", minLength: 2, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: healthCheckTypeValues, example: "http_endpoint" })
  @IsOptional()
  @IsIn([...healthCheckTypeValues])
  type?: HealthCheckType;

  @ApiPropertyOptional({
    example: "https://api.plusops.dev/ready",
    maxLength: 500,
    nullable: true
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  target?: string | null;

  @ApiPropertyOptional({
    example: "Checks whether the service should receive traffic.",
    maxLength: 1000,
    nullable: true
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isCritical?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 60, minimum: 10, maximum: 86400 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(86_400)
  intervalSeconds?: number;

  @ApiPropertyOptional({ example: 5000, minimum: 100, maximum: 120000 })
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
    type: Object,
    nullable: true
  })
  @ValidateIf(
    (dto: UpdateHealthCheckDto) =>
      dto.configuration !== undefined && dto.configuration !== null
  )
  @IsObject()
  configuration?: Record<string, unknown> | null;
}
