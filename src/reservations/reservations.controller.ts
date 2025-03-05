import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('reservations')
@ApiTags('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma nova reserva' })
  @ApiBody({
    description: 'Dados para criar uma nova reserva',
    type: CreateReservationDto,
    examples: {
      exemplo1: {
        summary: 'Reserva com todos os dados preenchidos',
        value: {
          contact_name: 'João da Silva',
          contact_phone: '51999521474',
          token_to_cancel: null,
          court_schedule_id: 1,
        },
      },
    },
  })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Post('/cancel/:id')
  @ApiOperation({ summary: 'Cancelar uma reserva pelo ID' })
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
  cancel(@Param('id') id: string, @Body('token') token: string) {
    return this.reservationsService.cancel(+id, token);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as reservas' })
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma reserva pelo ID' })
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(+id);
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
          contact_name: 'João da Silva',
          contact_phone: '51999521474',
          token_to_cancel: null,
          court_schedule_id: 1,
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(+id, updateReservationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma reserva pelo ID' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
