import { ApiProperty } from '@nestjs/swagger';

export class CreateDaysOfWeekDto {
  @ApiProperty({ description: 'Abreviação do dia da semana', maxLength: 3 })
  abbreviation: string;

  @ApiProperty({ description: 'Descrição do dia da semana', maxLength: 13 })
  description: string;

  @ApiProperty({
    description:
      'Referência do número do dia da semana (deve ser 0,1,2,3,4,5,6)',
    type: 'integer',
    enum: [0, 1, 2, 3, 4, 5, 6],
  })
  ref: number;
}
