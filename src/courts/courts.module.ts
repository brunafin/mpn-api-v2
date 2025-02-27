import { Module } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { OperatingSchedule } from 'src/operating_schedule/entities/operating_schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court, OperatingSchedule])],
  controllers: [CourtsController],
  providers: [CourtsService],
})
export class CourtsModule {}
