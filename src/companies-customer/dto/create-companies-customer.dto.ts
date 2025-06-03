import { ApiProperty } from '@nestjs/swagger';

export class CreateCompaniesCustomerDto {
  @ApiProperty({ description: 'Nome do cliente', maxLength: 50, example: 'João da Silva' })
  name: string;

  @ApiProperty({ description: 'Telefone do cliente com DDD', maxLength: 11, example: '51912345678' })
  phone: string;

  @ApiProperty({ description: 'E-mail do cliente', maxLength: 100, required: false, example: 'joao@email.com' })
  email?: string;

  @ApiProperty({ description: 'ID da empresa', example: 1 })
  company_id: number;
}
