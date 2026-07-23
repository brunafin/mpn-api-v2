import { Module } from '@nestjs/common';
import { CompaniesCustomerService } from './companies-customer.service';
import { CompaniesCustomerController } from './companies-customer.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyCustomer } from './entities/company-customer.entity';
import { Company } from 'src/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyCustomer, Company])],
  controllers: [CompaniesCustomerController],
  providers: [CompaniesCustomerService],
})
export class CompaniesCustomerModule {}
