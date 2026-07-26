import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Person } from 'src/people/entities/person.entity';
import { MercadoPagoModule } from 'src/mercado-pago/mercado-pago.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, PaymentCompany, Person]),
    MercadoPagoModule,
  ],
  controllers: [BillingController, MercadoPagoWebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
