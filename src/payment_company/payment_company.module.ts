import { Module } from '@nestjs/common';

/**
 * Entity `PaymentCompany` é usada por Billing/Platform.
 * O CRUD Nest scaffold (`payment-company`) foi removido — pagamentos reais
 * passam por `/billing` e `/platform`.
 */
@Module({})
export class PaymentCompanyModule {}
