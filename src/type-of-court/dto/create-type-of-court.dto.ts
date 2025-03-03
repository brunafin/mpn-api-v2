import { ApiProperty } from '@nestjs/swagger';

export class CreateTypeOfCourtDto {
  @ApiProperty({
    description: 'Nome do tipo da quadra (Futsal, Vôlei)',
    maxLength: 20,
  })
  name: string;

  @ApiProperty({ description: 'Descrição do tipo da quadra', maxLength: 50 })
  description: string;
}
