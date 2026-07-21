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
  Min,
  ValidateNested,
} from 'class-validator';

export class OnboardingDayDto {
  @ApiProperty({ description: 'Dia da semana (0=Domingo ... 6=Sábado)', example: 1 })
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week_ref: number;

  @ApiProperty({ description: 'Horas habilitadas nesse dia', example: ['08:00', '09:00'] })
  @IsArray()
  @IsString({ each: true })
  hours: string[];
}

export class OnboardingCourtDto {
  @ApiProperty({ example: 'Q1' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID do tipo de quadra' })
  @IsInt()
  type_of_court_id: number;

  @ApiProperty({ description: 'IDs dos esportes aceitos', example: [1, 2] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  sport_ids: number[];

  @ApiProperty({ description: 'Tipo de chão', required: false, example: 'madeira' })
  @IsOptional()
  @IsString()
  floor?: string;

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
  @ApiProperty({ description: 'Nome do estabelecimento', example: 'Arena Central' })
  @IsString()
  companyName: string;

  @ApiProperty({ required: false, example: '51999999999' })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiProperty({ type: [OnboardingDayDto], description: 'Grade semanal (horas abertas por dia)' })
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
