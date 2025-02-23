import { ApiProperty } from '@nestjs/swagger';

export class CreateDaysOfWeekDto {
  @ApiProperty({ description: 'Abreviação do dia da semana', maxLength: 3 })
  abbreviation: string;

  @ApiProperty({ description: 'Descrição do dia da semana', maxLength: 50 })
  description: string;

  @ApiProperty({
    description: 'Referência do número do dia da semana',
    type: 'integer',
  })
  ref: number;
}
