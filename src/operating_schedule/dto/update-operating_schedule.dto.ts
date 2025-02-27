import { PartialType } from '@nestjs/swagger';
import { CreateOperatingScheduleDto } from './create-operating_schedule.dto';

export class UpdateOperatingScheduleDto extends PartialType(CreateOperatingScheduleDto) {}
