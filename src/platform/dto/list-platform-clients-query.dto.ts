import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

function optionalBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

export enum PlatformClientsSort {
  NAME = 'name',
  CREATED_AT = 'created_at',
  LAST_LOGIN_AT = 'last_login_at',
  STATUS = 'status',
}

export class ListPlatformClientsQueryDto {
  /** Busca por nome da arena ou do dono. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Nome do plano ou id numérico (string). */
  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  is_active?: boolean;

  /** status do e-mail do dono (Person.status). */
  @IsOptional()
  @Transform(optionalBoolean)
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @IsEnum(PlatformClientsSort)
  sort?: PlatformClientsSort = PlatformClientsSort.LAST_LOGIN_AT;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
