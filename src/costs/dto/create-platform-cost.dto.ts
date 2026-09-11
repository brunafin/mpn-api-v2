import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CostRecurrence } from '../enums/cost-recurrence.enum';

export class CreatePlatformCostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsEnum(CostRecurrence)
  recurrence: CostRecurrence;
}
