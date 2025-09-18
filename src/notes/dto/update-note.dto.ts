import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateNoteDto } from './create-note.dto';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @ApiProperty({
    description: 'ID público da nota',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  noteId: string;
}
