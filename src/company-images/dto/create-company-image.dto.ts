import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyImageDto {
  @ApiProperty({ description: 'URL do bucket google cloud' })
  url: string;

  @ApiProperty({ description: 'ID da empresa' })
  company_id: number;
}
