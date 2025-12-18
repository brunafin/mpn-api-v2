import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { EmailService } from 'src/email/email.service';
import { TwilioService } from 'src/twilio/twilio.service';
import { CompanyCustomer } from 'src/companies-customer/entities/company-customer.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      CourtSchedule,
      CompanyCustomer,
      OperatingSchedule,
    ]),
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    JwtService,
    EmailService,
    TwilioService,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
