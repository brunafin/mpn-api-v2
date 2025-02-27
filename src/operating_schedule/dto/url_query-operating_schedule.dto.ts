import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

export class GetOperatingScheduleURLQueryDto {
  @IsString()
  @Transform(({ value }) => value.trim()) // Exemplo de transformação
  court_id: string;
}
