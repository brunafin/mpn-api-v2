import { Injectable } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
  ) {}
  create(createReservationDto: CreateReservationDto) {
    // TODO
    // adicionar verificações de horário já reservado
    // adicionar verificações de horário indisponível
    // adicionar verificações de horário não encontrado
    // atualizar status do horário para reservado
    // atualizar token para cancelamento
    // criar função do token para cancelamento
    // adicionar envio de email
    const reservation =
      this.reservationsRepository.create(createReservationDto);
    return this.reservationsRepository.save(reservation);
  }

  cancel(id: number, token: string) {
    // TODO
    // adicionar verificação de token
    // atualizar status do horário para disponível
    // deletar reserva
    // adicionar envio de email
    return `This action cancels a #${id} reservation with token ${token}`;
  }

  findAll() {
    return `This action returns all reservations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} reservation`;
  }

  update(id: number, updateReservationDto: UpdateReservationDto) {
    return `This action updates a #${id} reservation`;
  }

  remove(id: number) {
    return `This action removes a #${id} reservation`;
  }
}
