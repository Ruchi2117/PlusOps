import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength
} from "class-validator";

export class AIContextDto {
  @ApiPropertyOptional({ example: "ce04f443-cd77-4df2-bf6c-cd6f319b6bb4" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ example: "cfe49e62-858b-4f65-a528-5f236e892b0a" })
  @IsOptional()
  @IsUUID()
  incidentId?: string;

  @ApiPropertyOptional({ example: "https://github.com/plusops/payments-api" })
  @IsOptional()
  @IsUrl()
  repositoryUrl?: string;

  @ApiPropertyOptional({ example: "production" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  environment?: string;

  @ApiPropertyOptional({ example: ["payments", "latency"], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: { source: "incident" } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AIContextContainerDto {
  @ApiPropertyOptional({ type: AIContextDto })
  @IsOptional()
  @Type(() => AIContextDto)
  context?: AIContextDto;
}
