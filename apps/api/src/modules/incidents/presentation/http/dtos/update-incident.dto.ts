import { ApiPropertyOptional } from "@nestjs/swagger";
import type { UpdateIncidentRequest } from "@plusops/contracts";
import { Transform } from "class-transformer";
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidatorConstraint
} from "class-validator";
import type {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraintInterface
} from "class-validator";

@ValidatorConstraint({ name: "AtLeastOneIncidentUpdateField", async: false })
class AtLeastOneIncidentUpdateFieldConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as UpdateIncidentDto;

    return (
      dto.title !== undefined || dto.description !== undefined || dto.customerImpact !== undefined
    );
  }
}

function AtLeastOneIncidentUpdateField(validationOptions?: ValidationOptions) {
  return (target: object, propertyName: string): void => {
    registerDecorator({
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: AtLeastOneIncidentUpdateFieldConstraint
    });
  };
}

export class UpdateIncidentDto implements UpdateIncidentRequest {
  @AtLeastOneIncidentUpdateField({
    message: "At least one incident field must be provided."
  })
  private readonly atLeastOneField?: never;

  @ApiPropertyOptional({ example: "Checkout authorization failures", minLength: 3, maxLength: 160 })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    example: "Payment authorization requests are timing out for a subset of customers.",
    nullable: true,
    maxLength: 5000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    example: "Some customers cannot complete checkout.",
    nullable: true,
    maxLength: 1000
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerImpact?: string | null;
}
