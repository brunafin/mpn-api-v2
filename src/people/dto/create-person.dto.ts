import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/companies/entities/company.entity';

export class CreatePersonDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ maxLength: 50 })
  name: string;

  @ApiProperty({ maxLength: 20, required: false })
  phone: string;

  @ApiProperty({ maxLength: 100, required: false })
  email: string;

  @ApiProperty({ maxLength: 11, required: false })
  cpf: string;

  @ApiProperty({ required: false })
  born_date: Date;

  @ApiProperty({ maxLength: 9, required: false })
  cep: string;

  @ApiProperty({ maxLength: 100, required: false })
  street: string;

  @ApiProperty({ maxLength: 10, required: false })
  number: string;

  @ApiProperty({ maxLength: 50, required: false })
  city: string;

  @ApiProperty({ maxLength: 50, required: false })
  neighborhood: string;

  @ApiProperty({ maxLength: 2, required: false })
  uf: string;

  @ApiProperty()
  status: boolean;

  @ApiProperty({ type: 'string', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ApiProperty({ type: 'string', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ApiProperty({ type: [Company], required: false })
  companies: Company[];
}
