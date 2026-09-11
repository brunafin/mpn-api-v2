import { Transform } from 'class-transformer';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdatePlatformClientRepresentativeDto {
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return null;
    return value;
  })
  @IsOptional()
  @ValidateIf((_, value) => value != null)
  @IsUUID()
  representativePublicId: string | null;
}
