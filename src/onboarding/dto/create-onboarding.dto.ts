import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OnboardingDayDto {
  @ApiProperty({
    description: 'Dia da semana (0=Domingo ... 6=Sábado)',
    example: 1,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week_ref: number;

  @ApiProperty({
    description: 'Horas habilitadas nesse dia',
    example: ['08:00', '09:00'],
  })
  @IsArray()
  @IsString({ each: true })
  hours: string[];
}

export class OnboardingCourtDto {
  @ApiProperty({ example: 'Q1' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Nomes dos esportes aceitos (mapeados/criados no catálogo)',
    example: ['Futsal', 'Beach tennis'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sports: string[];

  @ApiProperty({ description: 'Tipo de piso', example: 'madeira' })
  @IsString()
  @MaxLength(30)
  floor: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  is_covered?: boolean;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  is_can_have_net?: boolean;

  @ApiProperty({ description: 'Preço padrão da quadra', example: 120 })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOnboardingDto {
  @ApiProperty({
    description: 'Nome do estabelecimento',
    example: 'Arena Central',
  })
  @IsString()
  companyName: string;

  @ApiProperty({ required: false, example: '51999999999' })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiProperty({
    description: 'CEP no formato 00000-000',
    example: '90010-000',
  })
  @IsString()
  @MaxLength(9)
  cep: string;

  @ApiProperty({ example: 'Rua dos Andradas' })
  @IsString()
  @MaxLength(100)
  street: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  @MaxLength(10)
  number: string;

  @ApiProperty({ example: 'Centro Histórico' })
  @IsString()
  @MaxLength(50)
  neighborhood: string;

  @ApiProperty({ example: 'Porto Alegre' })
  @IsString()
  @MaxLength(50)
  city: string;

  @ApiProperty({ example: 'RS', maxLength: 2 })
  @IsString()
  @MaxLength(2)
  uf: string;

  @ApiProperty({
    type: [OnboardingDayDto],
    description: 'Grade semanal (horas abertas por dia)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OnboardingDayDto)
  weekTemplate: OnboardingDayDto[];

  @ApiProperty({ type: [OnboardingCourtDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OnboardingCourtDto)
  courts: OnboardingCourtDto[];
}
