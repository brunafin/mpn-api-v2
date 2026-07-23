import { Module } from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { CourtSchedulesController } from './court-schedules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { Court } from 'src/courts/entities/court.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { PublicCourtSchedulesController } from './public-court-schedules.controller';
import { Company } from 'src/companies/entities/company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourtSchedule,
      OperatingSchedule,
      Court,
      Reservation,
      Company,
    ]),
  ],
  controllers: [CourtSchedulesController, PublicCourtSchedulesController],
  providers: [CourtSchedulesService],
  exports: [CourtSchedulesService],
})
export class CourtSchedulesModule {}
