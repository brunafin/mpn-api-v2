import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DaysOfWeekService } from './days-of-week.service';
import { CreateDaysOfWeekDto } from './dto/create-days-of-week.dto';
import { UpdateDaysOfWeekDto } from './dto/update-days-of-week.dto';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('days-of-week')
@ApiTags('days-of-week')
export class DaysOfWeekController {
  constructor(private readonly daysOfWeekService: DaysOfWeekService) { }

  @Post()
  @ApiOperation({ summary: 'Criar um dia da semana' })
  @ApiBody({
    description: 'Dados para criar um novo dia da semana',
    type: CreateDaysOfWeekDto,
    examples: {
      exemplo1: {
        summary: 'Dia da semana com todos os dados preenchidos',
        value: {
          abbreviation: 'dom',
          description: 'Domingo',
          ref: 1,
        },
      },
    },
  })
  create(@Body() createDaysOfWeekDto: CreateDaysOfWeekDto) {
    return this.daysOfWeekService.create(createDaysOfWeekDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os dias da semana' })
  @ApiOkResponse({
    description: 'Lista de todos os dias da semana retornada com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          abbreviation: { type: 'string', example: 'dom' },
          description: { type: 'string', example: 'Domingo' },
          ref: { type: 'int', example: 1 },
        },
      },
    },
  })
  findAll() {
    return this.daysOfWeekService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um dia da semana pelo ID' })
  @ApiOkResponse({
    description: 'Dia da semana retornado com sucesso',
    schema: {
      type: 'object',
      properties: {
        abbreviation: { type: 'string', example: 'dom' },
        description: { type: 'string', example: 'Domingo' },
        ref: { type: 'int', example: 1 },
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.daysOfWeekService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um dia da semana pelo ID' })
  @ApiBody({
    description: 'Dados para atualizar um dia da semana',
    type: UpdateDaysOfWeekDto,
    examples: {
      exemplo1: {
        summary: 'Atualização de todos os dados do dia da semana',
        value: {
          abbreviation: 'seg',
          description: 'Segunda-feira',
          ref: 2,
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() updateDaysOfWeekDto: UpdateDaysOfWeekDto,
  ) {
    return this.daysOfWeekService.update(+id, updateDaysOfWeekDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um dia da semana pelo ID' })
  remove(@Param('id') id: string) {
    return this.daysOfWeekService.remove(+id);
  }
}
