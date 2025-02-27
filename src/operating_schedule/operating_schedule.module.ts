import { Module } from '@nestjs/common';
import { OperatingScheduleService } from './operating_schedule.service';
import { OperatingScheduleController } from './operating_schedule.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatingSchedule } from './entities/operating_schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OperatingSchedule])],
  controllers: [OperatingScheduleController],
  providers: [OperatingScheduleService],
})
export class OperatingScheduleModule {}
