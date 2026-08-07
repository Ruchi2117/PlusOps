import { ApiProperty } from "@nestjs/swagger";
import type { ChangeIncidentSeverityRequest, IncidentSeverity } from "@plusops/contracts";
import { incidentSeverityValues } from "@plusops/contracts";
import { IsIn } from "class-validator";

export class ChangeIncidentSeverityDto implements ChangeIncidentSeverityRequest {
  @ApiProperty({ enum: incidentSeverityValues, example: "sev1" })
  @IsIn([...incidentSeverityValues])
  severity!: IncidentSeverity;
}
