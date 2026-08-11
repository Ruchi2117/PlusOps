import { ApiPropertyOptional } from "@nestjs/swagger";
import type { AlertOperator } from "@plusops/contracts";
import { alertOperatorValues } from "@plusops/contracts";
import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional } from "class-validator";

export class AlertThresholdDto {
  @ApiPropertyOptional({ enum: alertOperatorValues, example: "greater_than" })
  @IsIn([...alertOperatorValues])
  operator!: AlertOperator;

  @ApiPropertyOptional({ example: 500 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ example: 99 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ example: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  max?: number;
}
