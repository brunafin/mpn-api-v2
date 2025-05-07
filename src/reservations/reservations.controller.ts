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
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@Controller('reservation')
@ApiTags('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) { }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova reserva' })
  @ApiBody({
    description: 'Dados para criar uma nova reserva',
    type: CreateReservationDto,
    examples: {
      exemplo1: {
        summary: 'Reserva com todos os dados preenchidos',
        value: {
          contactName: 'João da Silva',
          contactPhone: '51912345678',
          courtSchedulePublicId: '550e8400-e29b-41d4-a716-446655440000',
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
        <form action="/reservations/cancel" method="POST">
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

  @Get()
  @ApiOperation({ summary: 'Listar todas as reservas' })
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':public_id')
  @ApiOperation({ summary: 'Buscar uma reserva pelo ID público' })
  findOne(@Param('public_id') public_id: string) {
    return this.reservationsService.findOneByPublicId(public_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma reserva pelo ID' })
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
    return this.reservationsService.updateByPublicId(public_id, updateReservationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma reserva pelo ID' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
