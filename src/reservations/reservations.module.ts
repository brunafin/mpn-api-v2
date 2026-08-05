import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { EmailService } from 'src/email/email.service';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { CompanyAccessModule } from 'src/companies/company-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      CourtSchedule,
      OperatingSchedule,
    ]),
    CompanyAccessModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, EmailService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
