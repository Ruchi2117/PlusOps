import { ApiPropertyOptional } from "@nestjs/swagger";
import type {
  ServiceLifecycleStatus,
  ServiceSortDirection,
  ServiceSortField,
  ServiceVisibility
} from "@plusops/contracts";
import {
  serviceLifecycleStatusValues,
  serviceSortFieldValues,
  serviceVisibilityValues,
  sortDirectionValues
} from "@plusops/contracts";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min
} from "class-validator";

export class ListServicesQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({ example: "payments", maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ example: "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d" })
  @IsOptional()
  @IsUUID()
  ownerTeamId?: string;

  @ApiPropertyOptional({ enum: serviceLifecycleStatusValues })
  @IsOptional()
  @IsIn([...serviceLifecycleStatusValues])
  lifecycleStatus?: ServiceLifecycleStatus;

  @ApiPropertyOptional({ enum: serviceVisibilityValues })
  @IsOptional()
  @IsIn([...serviceVisibilityValues])
  visibility?: ServiceVisibility;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ enum: serviceSortFieldValues, default: "name" })
  @IsOptional()
  @IsIn([...serviceSortFieldValues])
  sortBy?: ServiceSortField;

  @ApiPropertyOptional({ enum: sortDirectionValues, default: "asc" })
  @IsOptional()
  @IsIn([...sortDirectionValues])
  sortDirection?: ServiceSortDirection;
}

function transformOptionalBoolean(value: unknown): unknown {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return value;
}
