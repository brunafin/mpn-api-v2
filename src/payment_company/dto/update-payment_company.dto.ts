import { PartialType } from '@nestjs/swagger';
import { CreatePaymentCompanyDto } from './create-payment_company.dto';

export class UpdatePaymentCompanyDto extends PartialType(
  CreatePaymentCompanyDto,
) {}
