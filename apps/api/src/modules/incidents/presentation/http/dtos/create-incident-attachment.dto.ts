import { ApiProperty } from "@nestjs/swagger";
import type { CreateIncidentAttachmentRequest } from "@plusops/contracts";
import { Transform, Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateIncidentAttachmentDto implements CreateIncidentAttachmentRequest {
  @ApiProperty({
    example: "checkout-errors.png",
    maxLength: 255
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @ApiProperty({
    example: "image/png",
    maxLength: 120
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  contentType!: string;

  @ApiProperty({
    example: 248391,
    minimum: 1,
    maximum: 50000000
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50_000_000)
  size!: number;
}
