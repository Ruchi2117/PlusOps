import { ApiProperty } from "@nestjs/swagger";
import type { AssignIncidentRequest } from "@plusops/contracts";
import { IsUUID, ValidateIf } from "class-validator";

export class AssignIncidentDto implements AssignIncidentRequest {
  @ApiProperty({
    example: "8f1d2f56-d81c-4ae7-8f2e-0b82722a3ed6",
    nullable: true
  })
  @ValidateIf((_dto, value) => value !== null)
  @IsUUID()
  assigneeId!: string | null;
}
