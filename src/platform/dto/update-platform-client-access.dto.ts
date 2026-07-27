import { AccessMode } from 'src/companies/enums/access-mode.enum';
import { AccessReason } from 'src/companies/enums/access-reason.enum';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePlatformClientAccessDto {
  @IsEnum(AccessMode)
  accessMode: AccessMode;

  @IsOptional()
  @IsEnum(AccessReason)
  reason?: AccessReason;
}
