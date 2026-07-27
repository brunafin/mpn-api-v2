import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyImage } from 'src/company-images/entities/company-image.entity';
import { CompanyAccessModule } from './company-access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyImage]),
    CompanyAccessModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
