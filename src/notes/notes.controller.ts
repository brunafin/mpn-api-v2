import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CounterQueryDto } from './dto/counter-query.dto';
import { NotesByDateQueryDto } from './dto/notes-by-date-query.dto';

type AuthedRequest = {
  user: { userId: string };
};

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  create(
    @Body() createNoteDto: CreateNoteDto,
    @Req() req: AuthedRequest,
  ) {
    return this.notesService.create(createNoteDto, req.user.userId);
  }

  @Get('counter')
  @ApiQuery({ name: 'companyPublicId', type: String })
  counter(@Query() query: CounterQueryDto, @Req() req: AuthedRequest) {
    return this.notesService.counter(query.companyPublicId, req.user.userId);
  }

  @Get('')
  @ApiQuery({ name: 'companyPublicId', type: String })
  @ApiQuery({ name: 'date', type: String })
  findByDate(@Query() query: NotesByDateQueryDto, @Req() req: AuthedRequest) {
    return this.notesService.findByDate(
      query.companyPublicId,
      query.date,
      req.user.userId,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notesService.update(+id, req.user.userId);
  }
}
