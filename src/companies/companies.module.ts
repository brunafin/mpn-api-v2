import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyImage } from 'src/company-images/entities/company-image.entity';
import { CompanyAccessModule } from './company-access.module';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { PeopleModule } from 'src/people/people.module';
import { CourtsModule } from 'src/courts/courts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyImage, OperatingSchedule]),
    CompanyAccessModule,
    PeopleModule,
    CourtsModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
