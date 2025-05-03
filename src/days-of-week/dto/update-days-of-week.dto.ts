import { PartialType } from '@nestjs/swagger';
import { CreateDaysOfWeekDto } from './create-days-of-week.dto';

export class UpdateDaysOfWeekDto extends PartialType(CreateDaysOfWeekDto) {}
