import { Module } from '@nestjs/common';
import { OperatingScheduleService } from './operating-schedule.service';
import { OperatingScheduleController } from './operating-schedule.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatingSchedule } from './entities/operating-schedule.entity';
import { Court } from 'src/courts/entities/court.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperatingSchedule, Court])],
  controllers: [OperatingScheduleController],
  providers: [OperatingScheduleService],
})
export class OperatingScheduleModule {}
