import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import type { LoginRequest } from "@plusops/contracts";

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: "developer@plusops.dev" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "StrongerPass123" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
