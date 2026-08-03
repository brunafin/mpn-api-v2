import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    maxLength: 50,
    description: 'Nome do contato',
    example: 'João da Silva',
  })
  @IsString()
  @MaxLength(50)
  contactName: string;

  @ApiProperty({
    maxLength: 11,
    description: 'Telefone do contato com DDD',
    example: '51912345678',
  })
  @IsString()
  @MaxLength(20)
  contactPhone: string;

  @ApiProperty({
    description: 'ID do agendamento da quadra',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  courtSchedulePublicId: string;

  @ApiProperty({
    required: false,
    maxLength: 150,
    description: 'Observações adicionais',
    example: 'Levar bolas extras',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  observation?: string;

  @ApiProperty({
    required: false,
    description: 'Reserva inclui churrasqueira',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isBarbecueIncluded?: boolean;

  @ApiProperty({
    required: false,
    description: 'Reserva é para um evento',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEvent?: boolean;

  @ApiProperty({
    description: 'ID do esporte relacionado à reserva',
    example: 1,
    type: Number,
  })
  @IsInt()
  sportId: number;
}
