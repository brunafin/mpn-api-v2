import { Module } from '@nestjs/common';
import { DaysOfWeekService } from './days-of-week.service';
import { DaysOfWeekController } from './days-of-week.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DaysOfWeek } from './entities/days-of-week.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DaysOfWeek])],
  controllers: [DaysOfWeekController],
  providers: [DaysOfWeekService],
})
export class DaysOfWeekModule {}
