import { PartialType } from '@nestjs/swagger';
import { CreateCourtScheduleDto } from './create-court-schedule.dto';

export class UpdateCourtScheduleDto extends PartialType(CreateCourtScheduleDto) {}
