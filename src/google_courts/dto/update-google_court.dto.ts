import { PartialType } from '@nestjs/swagger';
import { CreateGoogleCourtDto } from './create-google_court.dto';

export class UpdateGoogleCourtDto extends PartialType(CreateGoogleCourtDto) {}
