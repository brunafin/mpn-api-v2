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
import { FixScheduleDto } from './dto/fix-schedule.dto';
import { UnfixScheduleDto } from './dto/unfix-schedule.dto';
import { UpdateDayAvailabilityDto } from './dto/update-day-availability.dto';
import { UpdateAvailabilityBatchDto } from './dto/update-availability-batch.dto';
import { QuickCreateScheduleDto } from './dto/quick-create-schedule.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { WriteAccessGuard } from 'src/common/guards/write-access.guard';

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
  @UseGuards(WriteAccessGuard)
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
  @UseGuards(WriteAccessGuard)
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

  @Patch('day-availability')
  @UseGuards(WriteAccessGuard)
  @ApiOperation({
    summary:
      'Atalho: inativar todos os livres OU ativar todos os inativos do dia (sem origem)',
  })
  @ApiBody({ type: UpdateDayAvailabilityDto })
  updateDayAvailability(
    @Body() body: UpdateDayAvailabilityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.updateDayAvailability(
      body,
      user.userId,
    );
  }

  @Patch('availability-batch')
  @UseGuards(WriteAccessGuard)
  @ApiOperation({
    summary:
      'Inativar/ativar horários por lista de public_ids (seleção múltipla)',
  })
  @ApiBody({ type: UpdateAvailabilityBatchDto })
  updateAvailabilityBatch(
    @Body() body: UpdateAvailabilityBatchDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.updateAvailabilityBatch(
      body,
      user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar horários de uma quadra do owner autenticado' })
  @ApiQuery({ name: 'courtId', type: Number, required: true })
  @ApiQuery({ name: 'hour', type: Number, required: false })
  @ApiQuery({ name: 'date', type: String, format: 'date', required: false })
  @ApiQuery({ name: 'city', type: String, required: false })
  @ApiQuery({ name: 'typeOfCourtId', type: Number, required: false })
  findAll(
    @Query('courtId') courtId: number,
    @CurrentUser() user: AuthUser,
    @Query('hour') hour?: string,
    @Query('date') date?: Date,
    @Query('city') city?: string,
    @Query('typeOfCourtId') typeOfCourtId?: number,
  ) {
    return this.courtSchedulesService.findAll(
      {
        courtId,
        hour,
        date,
        city,
        typeOfCourtId,
      },
      user.userId,
    );
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
  @UseGuards(WriteAccessGuard)
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
  @UseGuards(WriteAccessGuard)
  @ApiOperation({
    summary:
      'Excluir horário interno/órfão livre (disponível ou inativo; não remove grade comercial)',
  })
  remove(
    @Param('public_id') publicId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.removeByPublicId(publicId, user.userId);
  }

  @Patch(':public_id/availability')
  @UseGuards(WriteAccessGuard)
  @ApiOperation({
    summary: 'Atualizar a disponibilidade de um horário de quadra',
  })
  updateAvailability(
    @Param('public_id') publicId: string,
    @Body() body: UpdateAvailabilityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.updateAvailability(
      publicId,
      body.available,
      user.userId,
    );
  }

  @Post('fix')
  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: 'Fixar horário para um cliente' })
  @ApiBody({ type: FixScheduleDto })
  async fixSchedule(
    @Body() body: FixScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.fixSchedule(body, user.userId);
  }

  @Post('unfix')
  @UseGuards(WriteAccessGuard)
  @ApiOperation({ summary: 'Desafixar horário de um cliente' })
  @ApiBody({ type: UnfixScheduleDto })
  async unfixSchedule(
    @Body() body: UnfixScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.unfixSchedule(body, user.userId);
  }

  @Post('quick-create')
  @UseGuards(WriteAccessGuard)
  @ApiOperation({
    summary: 'Criar horário de quadra rapidamente para o usuário logado',
  })
  @ApiBody({ type: QuickCreateScheduleDto })
  async quickCreate(
    @Body() body: QuickCreateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.courtSchedulesService.quickCreate(body, user.userId);
  }
}
