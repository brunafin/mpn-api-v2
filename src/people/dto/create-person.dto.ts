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
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ maxLength: 20, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email: string;

  @ApiProperty({ maxLength: 11, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  cpf: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  born_date: Date;

  @ApiProperty({ maxLength: 9, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  cep: string;

  @ApiProperty({ maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  street: string;

  @ApiProperty({ maxLength: 10, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  number: string;

  @ApiProperty({ maxLength: 50, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city: string;

  @ApiProperty({ maxLength: 50, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  neighborhood: string;

  @ApiProperty({ maxLength: 2, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf: string;

  @ApiProperty()
  @IsBoolean()
  status: boolean;
}
