import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CounterQueryDto } from './dto/counter-query.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) { }

  @Post()
  create(@Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(createNoteDto);
  }

  @Get('counter')
  @ApiQuery({ name: 'companyPublicId', type: String })
  counter(@Query() query: CounterQueryDto) {
    return this.notesService.counter(query.companyPublicId);
  }

  @Get('')
  @ApiQuery({ name: 'companyPublicId', type: String })
  @ApiQuery({ name: 'date', type: String })
  findByDate(
    @Query() query: CounterQueryDto) {
    return this.notesService.findByDate(query.companyPublicId, query.date);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    return this.notesService.update(+id);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.notesService.remove(+id);
  // }
}
