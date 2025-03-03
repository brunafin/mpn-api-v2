import { Module } from '@nestjs/common';
import { OperatingScheduleService } from './operating-schedule.service';
import { OperatingScheduleController } from './operating-schedule.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatingSchedule } from './entities/operating-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperatingSchedule])],
  controllers: [OperatingScheduleController],
  providers: [OperatingScheduleService],
})
export class OperatingScheduleModule {}
