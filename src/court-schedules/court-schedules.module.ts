import { Module } from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { CourtSchedulesController } from './court-schedules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { Court } from 'src/courts/entities/court.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { AuthModule } from 'src/auth/auth.module';
import { JwtService } from 'src/jwt/jwt.service';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [TypeOrmModule.forFeature([CourtSchedule, OperatingSchedule, Court, Reservation]), JwtModule],
  controllers: [CourtSchedulesController],
  providers: [CourtSchedulesService],
})
export class CourtSchedulesModule { }
