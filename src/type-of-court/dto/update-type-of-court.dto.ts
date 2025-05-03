import { PartialType } from '@nestjs/swagger';
import { CreateTypeOfCourtDto } from './create-type-of-court.dto';

export class UpdateTypeOfCourtDto extends PartialType(CreateTypeOfCourtDto) {}
