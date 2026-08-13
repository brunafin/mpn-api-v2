import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SportNameDto } from 'src/sports/dto/sport-name.dto';
import { MAX_COURT_PRICE_REAIS } from 'src/utils/court-price';

export class CreateOwnedCourtDto {
  @ApiProperty({ example: 'Q2' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ type: [SportNameDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SportNameDto)
  sports: SportNameDto[];

  @ApiProperty({ example: 'madeira' })
  @IsString()
  @MaxLength(30)
  floor: string;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(MAX_COURT_PRICE_REAIS)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  is_covered?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  is_can_have_net?: boolean;

  @ApiPropertyOptional({
    description: 'Quadra de origem da grade. Sem valor, usa a primeira com OS.',
  })
  @IsOptional()
  @IsString()
  copyFromCourtPublicId?: string;
}
