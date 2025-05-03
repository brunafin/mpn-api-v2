import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsDate,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({ maxLength: 50, description: 'Nome da pessoa' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    maxLength: 20,
    required: false,
    description: 'Número de telefone da pessoa com DDD',
    example: '51912345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  phone: string;

  @ApiProperty({
    maxLength: 100,
    required: false,
    description: 'Endereço de email da pessoa',
    example: 'email@email.com.br'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    maxLength: 11,
    required: false,
    description: 'Número de CPF da pessoa',
    example: '12345678901'
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  cpf: string;

  @ApiProperty({ required: false, description: 'Data de nascimento da pessoa', example: '1990-01-01' })
  @IsOptional()
  @IsDate()
  born_date: Date;

  @ApiProperty({ maxLength: 9, required: false, description: 'CEP da pessoa', example: '94090000' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  cep: string;

  @ApiProperty({
    maxLength: 100,
    required: false,
    description: 'Rua da pessoa',
    example: 'Rua das Quadras'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  street: string;

  @ApiProperty({
    maxLength: 10,
    required: false,
    description: 'Número da residência da pessoa',
    example: '123'
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  number: string;

  @ApiProperty({
    maxLength: 50,
    required: false,
    description: 'Cidade da pessoa',
    example: 'Porto Alegre'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city: string;

  @ApiProperty({
    maxLength: 50,
    required: false,
    description: 'Bairro da pessoa',
    example: 'Centro Histórico'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  neighborhood: string;

  @ApiProperty({ maxLength: 2, required: false, description: 'UF da pessoa', example: 'RS' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf: string;

  @ApiProperty({ description: 'Status do cadastro da pessoa', example: true })
  @IsBoolean()
  status: boolean;
}
