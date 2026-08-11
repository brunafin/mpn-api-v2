import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Nome da empresa' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Telefone da empresa',
    required: false,
    maxLength: 11,
  })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  phone?: string;

  @ApiProperty({ description: 'URL do Instagram da empresa', required: false })
  @IsOptional()
  @IsString()
  instagram_url?: string;

  @ApiProperty({ description: 'URL do Facebook da empresa', required: false })
  @IsOptional()
  @IsString()
  facebook_url?: string;

  @ApiProperty({ description: 'Email da empresa', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'CEP da empresa', required: false, maxLength: 9 })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  cep?: string;

  @ApiProperty({ description: 'Rua da empresa', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({
    description: 'Número do endereço da empresa',
    required: false,
  })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ description: 'Cidade da empresa', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Bairro da empresa', required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ description: 'UF da empresa', required: false, maxLength: 2 })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  uf?: string;

  @ApiPropertyOptional({
    description:
      'Comodidades exibidas no portal (ex.: Vestiário, Estacionamento gratuito)',
    type: [String],
    example: ['Vestiário', 'Estacionamento gratuito'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characteristics?: string[];

  /**
   * @deprecated Ignorado no create — administrator vem do JWT.
   * Mantido no DTO só para não quebrar clientes antigos (whitelist).
   */
  @ApiPropertyOptional({
    description: 'Ignorado: dono sempre é o JWT autenticado',
    deprecated: true,
  })
  @IsOptional()
  administrator_id?: number;
}
