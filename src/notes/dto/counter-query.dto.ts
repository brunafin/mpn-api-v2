import { IsString } from 'class-validator';

export class CounterQueryDto {
  @IsString()
  companyPublicId: string;
}
