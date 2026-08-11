import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { RegisterServiceDependencyRequest } from "@plusops/contracts";
import { Transform } from "class-transformer";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class RegisterServiceDependencyDto implements RegisterServiceDependencyRequest {
  @ApiProperty({ example: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4" })
  @IsUUID()
  downstreamServiceId!: string;

  @ApiPropertyOptional({
    example: "Payments API calls Identity API during checkout authorization.",
    maxLength: 500
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
