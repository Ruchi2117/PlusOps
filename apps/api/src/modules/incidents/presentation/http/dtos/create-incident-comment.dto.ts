import { ApiProperty } from "@nestjs/swagger";
import type { CreateIncidentCommentRequest } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateIncidentCommentDto implements CreateIncidentCommentRequest {
  @ApiProperty({
    example: "Investigating elevated checkout authorization latency with @alice.",
    maxLength: 5000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}
