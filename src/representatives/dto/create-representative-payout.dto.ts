import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateRepresentativePayoutDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsDateString()
  paidAt: string;
}
