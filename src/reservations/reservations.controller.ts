import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiBody, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('reservation')
@ApiTags('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Criar uma nova reserva' })
  @ApiBody({
    description: 'Dados para criar uma nova reserva',
    schema: {
      type: 'object',
      properties: {
        contactName: { type: 'string', example: 'João da Silva' },
        contactPhone: { type: 'string', example: '51912345678' },
        courtSchedulePublicId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        sportId: { type: 'number', example: 1 },
        isBarbecueIncluded: { type: 'boolean', example: false },
        observation: { type: 'string', example: 'Levar bolas próprias' },
      },
      required: [
        'contactName',
        'contactPhone',
        'courtSchedulePublicId',
        'sport_id',
      ],
    },
    examples: {
      exemplo1: {
        summary: 'Reserva com todos os dados preenchidos',
        value: {
          contactName: 'João da Silva',
          contactPhone: '51912345678',
          courtSchedulePublicId: '550e8400-e29b-41d4-a716-446655440000',
          sportId: 1,
          isBarbecueIncluded: true,
          observation: 'Levar bolas próprias',
        },
      },
    },
  })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get('/cancel/:token')
  @ApiOperation({
    summary: 'Exibe a página de confirmação para cancelar a reserva',
  })
  async showCancelPage(@Param('token') token: string, @Res() res: Response) {
    const reservation = await this.reservationsService.findByToken(token);
    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada.');
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmação de Cancelamento</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center;">
        <h1>Tem certeza que deseja cancelar sua reserva?</h1>
        <p>Quadra: <strong>${reservation.courtName}</strong></p>
        <p>Data: <strong>${reservation.date}</strong></p>
        <p>Horário: <strong>${reservation.time}</strong></p>
        <p>Em nome de: <strong>${reservation.contactName} - ${reservation.contactPhone}</strong></p>
        <form action="/reservation/cancel" method="POST">
          <input type="hidden" name="token" value="${token}" />
          <button type="submit"
            style="background-color: #d9534f; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
            Confirmar Cancelamento
          </button>
        </form>
      </body>
      </html>
    `);
  }

  @Post('/cancel')
  @ApiOperation({ summary: 'Cancelar uma reserva pelo token de cancelamento' })
  @ApiBody({
    description: 'Token para cancelar a reserva',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
      },
      required: ['token'],
    },
  })
  cancel(@Body('token') token: string) {
    return this.reservationsService.cancel(token);
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
  findOne(@Param('public_id') public_id: string) {
    return this.reservationsService.findOneByPublicId(public_id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':public_id')
  @ApiOperation({ summary: 'Atualizar uma reserva pelo public_id' })
  @ApiBody({
    description: 'Dados para atualizar uma reserva',
    type: UpdateReservationDto,
    examples: {
      exemplo1: {
        summary: 'Reserva com todos os dados preenchidos',
        value: {
          contactName: 'João da Silva',
          contactPhone: '51999521474',
          courtSchedulePublicId: 1,
        },
      },
    },
  })
  update(
    @Param('public_id') public_id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.updateByPublicId(
      public_id,
      updateReservationDto,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':public_id/extra')
  @ApiOperation({
    summary:
      'Atualizar apenas observation e is_barbecue_included de uma reserva',
  })
  @ApiBody({
    description: 'Campos opcionais para atualizar',
    schema: {
      type: 'object',
      properties: {
        observation: { type: 'string', example: 'Novo texto de observação' },
        is_barbecue_included: { type: 'boolean', example: true },
      },
    },
  })
  async updateExtraFields(
    @Param('public_id') public_id: string,
    @Body()
    body: {
      observation?: string;
      is_barbecue_included?: boolean;
      is_event?: boolean;
    },
  ) {
    return this.reservationsService.updateExtraFields(public_id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma reserva pelo ID' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':court_schedule_public_id/contact')
  @ApiOperation({ summary: 'Atualizar dados de contato da reserva' })
  @ApiBody({
    description: 'Campos para atualizar o contato da reserva',
    schema: {
      type: 'object',
      properties: {
        contactName: { type: 'string', example: 'Maria Oliveira' },
        contactPhone: { type: 'string', example: '51987654321' },
      },
      required: ['contactName', 'contactPhone'],
    },
  })
  async updateContact(
    @Param('court_schedule_public_id') courtSchedulePublicId: string,
    @Body() body: { contactName: string; contactPhone: string },
  ) {
    return this.reservationsService.updateContact(
      courtSchedulePublicId,
      body.contactName,
      body.contactPhone,
    );
  }
}
