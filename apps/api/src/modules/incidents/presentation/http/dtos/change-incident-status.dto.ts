import { ApiProperty } from "@nestjs/swagger";
import type { ChangeIncidentStatusRequest, IncidentStatus } from "@plusops/contracts";
import { incidentStatusValues } from "@plusops/contracts";
import { IsIn } from "class-validator";

export class ChangeIncidentStatusDto implements ChangeIncidentStatusRequest {
  @ApiProperty({ enum: incidentStatusValues, example: "investigating" })
  @IsIn([...incidentStatusValues])
  status!: IncidentStatus;
}
