import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class MetricLabelDto {
  @ApiProperty({ example: "environment", minLength: 1, maxLength: 63 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  @Matches(/^[a-z][a-z0-9_]*$/)
  key!: string;

  @ApiProperty({ example: "production", minLength: 1, maxLength: 120 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;
}
