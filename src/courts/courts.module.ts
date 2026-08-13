import { Module } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CourtsController } from './courts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Company } from 'src/companies/entities/company.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { CompanyAccessModule } from 'src/companies/company-access.module';
import { CourtSchedulesModule } from 'src/court-schedules/court-schedules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Court, Company, OperatingSchedule]),
    CompanyAccessModule,
    CourtSchedulesModule,
  ],
  controllers: [CourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
