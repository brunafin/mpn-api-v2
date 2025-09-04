import { Module } from '@nestjs/common';
import { PaymentCompanyService } from './payment_company.service';
import { PaymentCompanyController } from './payment_company.controller';

@Module({
  controllers: [PaymentCompanyController],
  providers: [PaymentCompanyService],
})
export class PaymentCompanyModule {}
