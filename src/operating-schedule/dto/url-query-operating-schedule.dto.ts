import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UrlQueryParamOperatingScheduleDto {
  @IsNumber()
  @Type(() => Number)
  courtId: number;
}
