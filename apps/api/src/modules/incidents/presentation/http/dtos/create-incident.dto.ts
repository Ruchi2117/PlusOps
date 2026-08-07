import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { IncidentPriority, IncidentSeverity, CreateIncidentRequest } from "@plusops/contracts";
import { incidentPriorityValues, incidentSeverityValues } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateIncidentDto implements CreateIncidentRequest {
  @ApiProperty({ example: "Checkout authorization failures", minLength: 3, maxLength: 160 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({
    example: "Payment authorization requests are timing out for a subset of customers.",
    maxLength: 5000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d" })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ enum: incidentSeverityValues, example: "sev2" })
  @IsIn([...incidentSeverityValues])
  severity!: IncidentSeverity;

  @ApiProperty({ enum: incidentPriorityValues, example: "high" })
  @IsIn([...incidentPriorityValues])
  priority!: IncidentPriority;

  @ApiPropertyOptional({
    example: "Some customers cannot complete checkout.",
    maxLength: 1000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerImpact?: string;
}
