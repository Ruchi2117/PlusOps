import { ApiPropertyOptional } from "@nestjs/swagger";
import type { RunHealthCheckRequest, ServiceHealthStatus } from "@plusops/contracts";
import { serviceHealthStatusValues } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class RunHealthCheckDto implements RunHealthCheckRequest {
  @ApiPropertyOptional({ enum: serviceHealthStatusValues, default: "healthy" })
  @IsOptional()
  @IsIn([...serviceHealthStatusValues])
  status?: ServiceHealthStatus;

  @ApiPropertyOptional({ example: 42, minimum: 0, maximum: 600000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600_000)
  responseTimeMs?: number;

  @ApiPropertyOptional({ example: "Synthetic probe returned HTTP 200.", maxLength: 1000 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
