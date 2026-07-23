import { Module } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Company } from 'src/companies/entities/company.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Court, Company, OperatingSchedule])],
  controllers: [CourtsController],
  providers: [CourtsService],
})
export class CourtsModule {}
