import { PartialType } from '@nestjs/swagger';
import { CreateOperatingScheduleDto } from './create-operating-schedule.dto';

export class UpdateOperatingScheduleDto extends PartialType(
  CreateOperatingScheduleDto,
) {}
