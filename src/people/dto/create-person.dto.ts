import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/companies/entities/company.entity';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsOptional,
  MaxLength,
  IsArray,
} from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({ maxLength: 50, description: 'Nome da pessoa' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    maxLength: 20,
    required: false,
    description: 'Número de telefone da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    maxLength: 100,
    required: false,
    description: 'Endereço de email da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    maxLength: 11,
    required: false,
    description: 'Número de CPF da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  cpf: string;

  @ApiProperty({ required: false, description: 'Data de nascimento da pessoa' })
  @IsOptional()
  @IsDate()
  born_date: Date;

  @ApiProperty({ maxLength: 9, required: false, description: 'CEP da pessoa' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  cep: string;

  @ApiProperty({
    maxLength: 100,
    required: false,
    description: 'Rua da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  street: string;

  @ApiProperty({
    maxLength: 10,
    required: false,
    description: 'Número da residência da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  number: string;

  @ApiProperty({
    maxLength: 50,
    required: false,
    description: 'Cidade da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city: string;

  @ApiProperty({
    maxLength: 50,
    required: false,
    description: 'Bairro da pessoa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  neighborhood: string;

  @ApiProperty({ maxLength: 2, required: false, description: 'UF da pessoa' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf: string;

  @ApiProperty({ description: 'Status do cadastro da pessoa' })
  @IsBoolean()
  status: boolean;
}
