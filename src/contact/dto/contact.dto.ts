import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiPropertyOptional({ example: '51999887766' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Se true, prefere retorno pelo WhatsApp (exige telefone)',
  })
  @IsOptional()
  @IsBoolean()
  preferWhatsapp?: boolean;

  @ApiProperty({ example: 'Gostaria de saber mais sobre o teste grátis.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  /** Honeypot — bots preenchem; humanos deixam vazio. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
