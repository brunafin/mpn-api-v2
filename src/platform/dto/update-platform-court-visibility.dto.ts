import { IsBoolean } from 'class-validator';

export class UpdatePlatformCourtVisibilityDto {
  @IsBoolean()
  show: boolean;
}
