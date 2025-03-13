import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { EmailService } from 'src/email/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, CourtSchedule])],
  controllers: [ReservationsController],
  providers: [ReservationsService, JwtService, EmailService],
})
export class ReservationsModule {}
