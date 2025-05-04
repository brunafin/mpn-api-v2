import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@Controller('court-schedules')
@ApiTags('court-schedules')
export class CourtSchedulesController {
  constructor(private readonly courtSchedulesService: CourtSchedulesService) { }

  @Post()
  @ApiOperation({ summary: 'Criar um horário de quadra' })
  @ApiBody({
    description: 'Dados para criar um novo horário de quadra',
    type: CreateCourtScheduleDto,
    examples: {
      exemplo1: {
        summary: 'Horário de quadra com todos os dados preenchidos',
        value: {
          start_hour: '08:00',
          end_hour: '09:00',
          date: '2023-10-01',
          available: true,
          price: 50.0,
          is_fixed: false,
          court_id: 1,
          day_of_week_id: 1,
        },
      },
    },
  })
  create(@Body() createCourtScheduleDto: CreateCourtScheduleDto) {
    return this.courtSchedulesService.create(createCourtScheduleDto);
  }

  @Post('/populate')
  @ApiOperation({
    summary: 'Popular horários de uma quadra com base em data inicial e final',
  })
  @ApiBody({
    description: 'Dados para popular horários de uma quadra',
    schema: {
      type: 'object',
      properties: {
        court_id: { type: 'number' },
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
      },
      example: {
        court_id: 1,
        start_date: '2023-10-01',
        end_date: '2023-10-07',
      },
    },
  })
  populateCourtSchedule(
    @Body() body: { court_id: number; start_date: string; end_date: string },
  ) {
    const { court_id, start_date, end_date } = body;
    return this.courtSchedulesService.populateCourtSchedule(
      court_id,
      start_date,
      end_date,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os horários de quadra' })
  @ApiQuery({ name: 'courtId', type: Number, required: true })
  @ApiQuery({ name: 'hour', type: Number, required: false })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: false })
  @ApiQuery({ name: 'city', type: String, required: false })
  @ApiQuery({ name: 'typeOfCourtId', type: Number, required: false })
  findAll(
    @Query('courtId') courtId: number,
    @Query('hour') hour?: string,
    @Query('date') date?: Date,
    @Query('city') city?: string,
    @Query('typeOfCourtId') typeOfCourtId?: number,
  ) {
    return this.courtSchedulesService.findAll({
      courtId,
      hour,
      date,
      city,
      typeOfCourtId,
    });
  }

  @Get(':public_id')
  @ApiOperation({ summary: 'Obter um horário de quadra pelo public_id da quadra' })
  findOne(@Param('public_id') publicId: string) {
    return this.courtSchedulesService.findOneByPublicId(publicId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um horário de quadra pelo ID' })
  @ApiBody({
    description: 'Dados para atualizar um horário de quadra',
    type: UpdateCourtScheduleDto,
    examples: {
      exemplo1: {
        summary: 'Atualização de horário de quadra',
        value: {
          start_hour: '10:00',
          end_hour: '11:00',
          date: '2023-10-02',
          available: false,
          price: 60.0,
          court_id: 1,
          is_fixed: true,
          day_of_week_id: 2,
        },
      },
    },
  })
  update(
    @Param('public_id') publicId: string,
    @Body() updateCourtScheduleDto: UpdateCourtScheduleDto,
  ) {
    return this.courtSchedulesService.updateByPublicId(publicId, updateCourtScheduleDto);
  }

  @Delete(':public_id')
  @ApiOperation({ summary: 'Remover um horário de quadra pelo public_id' })
  remove(@Param('public_id') publicId: string) {
    return this.courtSchedulesService.removeByPublicId(publicId);
  }
}
