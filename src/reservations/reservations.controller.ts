import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

type AuthedRequest = {
  user: { userId: string };
};

@Controller('reservation')
@ApiTags('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar uma nova reserva' })
  create(
    @Body() createReservationDto: CreateReservationDto,
    @Req() req: AuthedRequest,
  ) {
    return this.reservationsService.create(
      createReservationDto,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar todas as reservas' })
  findAll() {
    return this.reservationsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get(':public_id')
  @ApiOperation({ summary: 'Buscar uma reserva pelo ID público' })
  findOne(
    @Param('public_id') public_id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.reservationsService.findOneByPublicId(
      public_id,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':public_id')
  @ApiOperation({ summary: 'Atualizar uma reserva pelo public_id' })
  update(
    @Param('public_id') public_id: string,
    @Body() updateReservationDto: UpdateReservationDto,
    @Req() req: AuthedRequest,
  ) {
    return this.reservationsService.updateByPublicId(
      public_id,
      updateReservationDto,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':public_id/extra')
  @ApiOperation({
    summary:
      'Atualizar apenas observation e is_barbecue_included de uma reserva',
  })
  async updateExtraFields(
    @Param('public_id') public_id: string,
    @Body()
    body: {
      observation?: string;
      is_barbecue_included?: boolean;
      is_event?: boolean;
    },
    @Req() req: AuthedRequest,
  ) {
    return this.reservationsService.updateExtraFields(
      public_id,
      body,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':public_id')
  @ApiOperation({
    summary: 'Cancelar/remover uma reserva (autenticado, com ownership)',
  })
  cancel(
    @Param('public_id') public_id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.reservationsService.cancelByPublicId(
      public_id,
      req.user.userId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':court_schedule_public_id/contact')
  @ApiOperation({ summary: 'Atualizar dados de contato da reserva' })
  async updateContact(
    @Param('court_schedule_public_id') courtSchedulePublicId: string,
    @Body() body: { contactName: string; contactPhone: string },
    @Req() req: AuthedRequest,
  ) {
    return this.reservationsService.updateContact(
      courtSchedulePublicId,
      body.contactName,
      body.contactPhone,
      req.user.userId,
    );
  }
}
