import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Nome da empresa' })
  name: string;

  @ApiProperty({ description: 'Telefone da empresa', required: false, maxLength: 11 })
  phone: string;

  @ApiProperty({ description: 'URL do Instagram da empresa', required: false })
  instagram_url: string;

  @ApiProperty({ description: 'URL do Facebook da empresa', required: false })
  facebook_url: string;

  @ApiProperty({ description: 'Email da empresa', required: false })
  email: string;

  @ApiProperty({ description: 'CEP da empresa', required: false, maxLength: 9 })
  cep: string;

  @ApiProperty({ description: 'Rua da empresa', required: false })
  street: string;

  @ApiProperty({
    description: 'Número do endereço da empresa',
    required: false,
  })
  number: string;

  @ApiProperty({ description: 'Cidade da empresa', required: false })
  city: string;

  @ApiProperty({ description: 'Bairro da empresa', required: false })
  neighborhood: string;

  @ApiProperty({ description: 'UF da empresa', required: false, maxLength: 2 })
  uf: string;

  @ApiProperty({ description: 'ID do administrador da empresa' })
  administrator_id: number;
}
