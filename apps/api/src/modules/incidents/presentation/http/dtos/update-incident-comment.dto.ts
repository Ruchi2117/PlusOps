import { ApiProperty } from "@nestjs/swagger";
import type { UpdateIncidentCommentRequest } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdateIncidentCommentDto implements UpdateIncidentCommentRequest {
  @ApiProperty({
    example: "Mitigation is deployed and error rates are stabilizing.",
    maxLength: 5000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
