import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OperatingScheduleService } from './operating_schedule.service';
import { CreateOperatingScheduleDto } from './dto/create-operating_schedule.dto';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { GetOperatingScheduleURLQueryDto } from './dto/url_query-operating_schedule.dto';

@Controller('operating-schedule')
@ApiTags('operating-schedule')
export class OperatingScheduleController {
  constructor(
    private readonly operatingScheduleService: OperatingScheduleService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um horário de funcionamento' })
  @ApiBody({
    description: 'Dados para criar um novo horário de funcionamento',
    type: CreateOperatingScheduleDto,
    examples: {
      exemplo1: {
        summary: 'Horário de funcionamento com todos os dados preenchidos',
        value: {
          hour: 10,
          price: 50.0,
          day_of_week_id: 1,
          court_id: 2,
        },
      },
    },
  })
  create(@Body() createOperatingScheduleDto: CreateOperatingScheduleDto) {
    return this.operatingScheduleService.create(createOperatingScheduleDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os horários de funcionamento de uma quadra',
  })
  @ApiQuery({ name: 'court_id', required: true, type: Number })
  @ApiOkResponse({
    description: 'Lista de todos os horários de funcionamento de uma quadra',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'int', example: 1 },
          hour: { type: 'int', example: 10 },
          price: { type: 'float', example: 50.0 },
          day_of_week_id: { type: 'int', example: 1 },
          court_id: { type: 'int', example: 2 },
        },
      },
    },
  })
  findAllByCourtId(@Query() query: GetOperatingScheduleURLQueryDto) {
    return this.operatingScheduleService.findAllByCourtId(query);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.operatingScheduleService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateOperatingScheduleDto: UpdateOperatingScheduleDto,
  // ) {
  //   return this.operatingScheduleService.update(
  //     +id,
  //     updateOperatingScheduleDto,
  //   );
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.operatingScheduleService.remove(+id);
  // }
}
