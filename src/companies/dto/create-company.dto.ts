import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  phone: string;

  @ApiProperty({ required: false })
  instagram_url: string;

  @ApiProperty({ required: false })
  facebook_url: string;

  @ApiProperty({ required: false })
  email: string;

  @ApiProperty({ required: false })
  cep: string;

  @ApiProperty({ required: false })
  street: string;

  @ApiProperty({ required: false })
  number: string;

  @ApiProperty({ required: false })
  city: string;

  @ApiProperty({ required: false })
  neighborhood: string;

  @ApiProperty({ required: false })
  uf: string;

  @ApiProperty()
  administrator_id: number;
}
