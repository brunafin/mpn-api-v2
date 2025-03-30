import { ApiProperty } from '@nestjs/swagger';

export class CreateTypeOfCourtDto {
  @ApiProperty({
    description: 'Tipo da quadra (Futsal, Beach, Society)',
    enum: ['Futsal', 'Beach', 'Society'],
  })
  type: 'Futsal' | 'Beach' | 'Society';

  @ApiProperty({ description: 'Descrição do tipo da quadra', maxLength: 50 })
  description: string;
}
