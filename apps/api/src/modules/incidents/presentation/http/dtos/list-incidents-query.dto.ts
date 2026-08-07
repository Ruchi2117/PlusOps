import { ApiPropertyOptional } from "@nestjs/swagger";
import type {
  IncidentPriority,
  IncidentSeverity,
  IncidentSortField,
  IncidentStatus,
  SortDirection
} from "@plusops/contracts";
import {
  incidentPriorityValues,
  incidentSeverityValues,
  incidentSortFieldSchema,
  incidentStatusValues,
  sortDirectionSchema
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

const incidentSortFields = incidentSortFieldSchema.options;
const sortDirections = sortDirectionSchema.options;

export class ListIncidentsQueryDto {
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

  @ApiPropertyOptional({ enum: incidentStatusValues })
  @IsOptional()
  @IsIn([...incidentStatusValues])
  status?: IncidentStatus;

  @ApiPropertyOptional({ enum: incidentSeverityValues })
  @IsOptional()
  @IsIn([...incidentSeverityValues])
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: incidentPriorityValues })
  @IsOptional()
  @IsIn([...incidentPriorityValues])
  priority?: IncidentPriority;

  @ApiPropertyOptional({ example: "2f4b68e4-9c73-4eb0-8c79-b0fd9b82408d" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ example: "8f1d2f56-d81c-4ae7-8f2e-0b82722a3ed6" })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @Transform(({ value }) => transformOptionalBoolean(value))
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ example: "checkout", maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: incidentSortFields, default: "updatedAt" })
  @IsOptional()
  @IsIn([...incidentSortFields])
  sortBy?: IncidentSortField;

  @ApiPropertyOptional({ enum: sortDirections, default: "desc" })
  @IsOptional()
  @IsIn([...sortDirections])
  sortDirection?: SortDirection;
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
