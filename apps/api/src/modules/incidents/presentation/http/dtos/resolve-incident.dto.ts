import { ApiPropertyOptional } from "@nestjs/swagger";
import type { ResolveIncidentRequest } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ResolveIncidentDto implements ResolveIncidentRequest {
  @ApiPropertyOptional({
    example: "Traffic is stable and error rates returned to baseline.",
    maxLength: 1000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  resolutionSummary?: string;
}
