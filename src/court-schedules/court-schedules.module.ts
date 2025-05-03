import { Module } from '@nestjs/common';
import { CourtSchedulesService } from './court-schedules.service';
import { CourtSchedulesController } from './court-schedules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtSchedule } from './entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourtSchedule, OperatingSchedule])],
  controllers: [CourtSchedulesController],
  providers: [CourtSchedulesService],
})
export class CourtSchedulesModule { }
