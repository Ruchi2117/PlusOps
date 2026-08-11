import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { AIMessageRole, AIProvider } from "@plusops/contracts";
import { aiMessageRoleValues, aiProviderValues } from "@plusops/contracts";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

import { AIContextDto } from "./ai-context.dto";

export class AIChatMessageDto {
  @ApiProperty({ enum: aiMessageRoleValues, example: "user" })
  @IsIn([...aiMessageRoleValues])
  role!: AIMessageRole;

  @ApiProperty({ example: "What changed in the latency alert?", maxLength: 50000 })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content!: string;
}

export class AIChatDto {
  @ApiPropertyOptional({ enum: aiProviderValues })
  @IsOptional()
  @IsIn([...aiProviderValues])
  provider?: AIProvider;

  @ApiPropertyOptional({ example: "3b5c5213-7055-461b-bd38-86c269d98ef7" })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({ example: "Explain why checkout latency is high.", maxLength: 50000 })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  message!: string;

  @ApiPropertyOptional({ type: AIContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AIContextDto)
  context?: AIContextDto;

  @ApiPropertyOptional({ type: [AIChatMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AIChatMessageDto)
  history?: AIChatMessageDto[];
}
