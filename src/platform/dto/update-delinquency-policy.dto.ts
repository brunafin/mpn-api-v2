import { IsInt, Max, Min } from 'class-validator';
import {
  DELINQUENCY_BLOCK_AFTER_DAYS_MAX,
  DELINQUENCY_BLOCK_AFTER_DAYS_MIN,
} from 'src/billing/delinquency';

export class UpdateDelinquencyPolicyDto {
  @IsInt()
  @Min(DELINQUENCY_BLOCK_AFTER_DAYS_MIN)
  @Max(DELINQUENCY_BLOCK_AFTER_DAYS_MAX)
  blockAfterDays: number;
}
