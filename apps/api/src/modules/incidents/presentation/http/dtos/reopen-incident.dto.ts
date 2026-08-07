import { ApiProperty } from "@nestjs/swagger";
import type { ReopenIncidentRequest } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ReopenIncidentDto implements ReopenIncidentRequest {
  @ApiProperty({
    example: "Error rates increased again after mitigation.",
    maxLength: 1000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
