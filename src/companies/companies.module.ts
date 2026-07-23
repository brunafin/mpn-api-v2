import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyImage } from 'src/company-images/entities/company-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyImage])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
