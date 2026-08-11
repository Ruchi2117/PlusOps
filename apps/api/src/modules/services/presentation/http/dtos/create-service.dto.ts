import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateServiceRequest,
  ServiceLifecycleStatus,
  ServiceVisibility
} from "@plusops/contracts";
import { serviceLifecycleStatusValues, serviceVisibilityValues } from "@plusops/contracts";
import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator";

export class CreateServiceDto implements CreateServiceRequest {
  @ApiProperty({ example: "Payments API", minLength: 2, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: "payments-api", minLength: 2, maxLength: 80 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @ApiPropertyOptional({
    example: "Owns payment authorization and capture workflows.",
    maxLength: 1000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d" })
  @IsUUID()
  ownerTeamId!: string;

  @ApiPropertyOptional({ example: "https://github.com/example/payments-api" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  repositoryUrl?: string;

  @ApiPropertyOptional({ example: "https://api.plusops.dev/payments" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  apiBaseUrl?: string;

  @ApiPropertyOptional({ example: "https://docs.plusops.dev/services/payments-api" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  documentationUrl?: string;

  @ApiPropertyOptional({ example: "https://docs.plusops.dev/runbooks/payments-api" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  runbookUrl?: string;

  @ApiPropertyOptional({ enum: serviceLifecycleStatusValues, default: "active" })
  @IsOptional()
  @IsIn([...serviceLifecycleStatusValues])
  lifecycleStatus?: ServiceLifecycleStatus;

  @ApiPropertyOptional({ enum: serviceVisibilityValues, default: "internal" })
  @IsOptional()
  @IsIn([...serviceVisibilityValues])
  visibility?: ServiceVisibility;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 5, default: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  tier?: number;

  @ApiPropertyOptional({
    example: ["e67bd8c4-1cb5-4070-89f9-585854cce7ac"],
    type: [String],
    maxItems: 20
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  environmentIds?: string[];
}
