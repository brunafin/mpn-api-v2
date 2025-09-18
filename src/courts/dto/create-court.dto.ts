import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsString,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Sport } from 'src/sports/entities/sport.entity';

export class CreateCourtDto {
  @ApiProperty({ maxLength: 100, description: 'Nome da quadra' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID da empresa' })
  @IsInt()
  company_id: number;

  @ApiProperty({ description: 'Status da visibilidade da quadra no site' })
  @IsBoolean()
  show: boolean;

  @ApiProperty({ description: 'ID do tipo de quadra' })
  @IsInt()
  type_of_court_id: number;

  @ApiProperty({ description: 'Se a quadra é coberta', default: false })
  @IsBoolean()
  is_covered: boolean;

  @ApiProperty({ description: 'Se a quadra pode ter rede', default: false })
  @IsBoolean()
  is_can_have_net: boolean;

  @ApiProperty({
    description: 'Array de objetos da entidade Sports associados à quadra',
    type: [Object],
    example: [
      { id: 1, name: 'Futebol' },
      { id: 2, name: 'Vôlei' },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  sports: Sport[];
}
