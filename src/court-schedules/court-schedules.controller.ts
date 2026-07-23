import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { CreateCourtScheduleDto } from './dto/create-court-schedule.dto';
import { UpdateCourtScheduleDto } from './dto/update-court-schedule.dto';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

type AuthUser = { userId: string };

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('court-schedules')
@ApiTags('court-schedules')
export class CourtSchedulesController {
  constructor(private readonly courtSchedulesService: CourtSchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um horário de quadra' })
  @ApiBody({
    description: 'Dados para criar um novo horário de quadra',
    type: CreateCourtScheduleDto,
  })
  create(
    @Body() createCourtScheduleDto: CreateCourtScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.create(
      createCourtScheduleDto,
      user.userId,
    );
  }

  @Post('/populate')
  @ApiOperation({
    summary: 'Popular horários de uma quadra com base em data inicial e final',
  })
  populateCourtSchedule(
    @Body() body: { court_id: number; start_date: string; end_date: string },
    @CurrentUser() user: AuthUser,
  ) {
    const { court_id, start_date, end_date } = body;
    return this.courtSchedulesService.populateCourtSchedule(
      court_id,
      start_date,
      end_date,
      user.userId,
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
  @ApiOperation({
    summary: 'Obter um horário de quadra pelo public_id da quadra',
  })
  findOne(
    @Param('public_id') publicId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.findOneByPublicId(
      publicId,
      user.userId,
    );
  }

  @Patch(':public_id')
  @ApiOperation({ summary: 'Atualizar um horário de quadra pelo public_id' })
  @ApiBody({
    description: 'Dados para atualizar um horário de quadra',
    type: UpdateCourtScheduleDto,
  })
  update(
    @Param('public_id') publicId: string,
    @Body() updateCourtScheduleDto: UpdateCourtScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.updateByPublicId(
      publicId,
      updateCourtScheduleDto,
      user.userId,
    );
  }

  @Delete(':public_id')
  @ApiOperation({ summary: 'Remover um horário de quadra pelo public_id' })
  remove(
    @Param('public_id') publicId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.removeByPublicId(publicId, user.userId);
  }

  @Patch(':public_id/availability')
  @ApiOperation({
    summary: 'Atualizar a disponibilidade de um horário de quadra',
  })
  updateAvailability(
    @Param('public_id') publicId: string,
    @Body('available') available: boolean,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.updateAvailability(
      publicId,
      available,
      user.userId,
    );
  }

  @Post('fix')
  @ApiOperation({ summary: 'Fixar horário para um cliente' })
  async fixSchedule(
    @Body() body: { court_schedule_public_id: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.fixSchedule(body, user.userId);
  }

  @Post('unfix')
  @ApiOperation({ summary: 'Desafixar horário de um cliente' })
  async unfixSchedule(
    @Body() body: { court_schedule_public_id: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.unfixSchedule(body, user.userId);
  }

  @Post('quick-create')
  @ApiOperation({
    summary: 'Criar horário de quadra rapidamente para o usuário logado',
  })
  async quickCreate(
    @Body() body: { start_hour: string; date: string; court_id: number },
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.quickCreate(body, user.userId);
  }
}
