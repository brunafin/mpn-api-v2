import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Plan } from './entities/plan.entity';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Company, PaymentCompany])],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
