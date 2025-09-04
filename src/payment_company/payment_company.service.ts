import { Injectable } from '@nestjs/common';
import { CreatePaymentCompanyDto } from './dto/create-payment_company.dto';
import { UpdatePaymentCompanyDto } from './dto/update-payment_company.dto';

@Injectable()
export class PaymentCompanyService {
  create(createPaymentCompanyDto: CreatePaymentCompanyDto) {
    return 'This action adds a new paymentCompany';
  }

  findAll() {
    return `This action returns all paymentCompany`;
  }

  findOne(id: number) {
    return `This action returns a #${id} paymentCompany`;
  }

  update(id: number, updatePaymentCompanyDto: UpdatePaymentCompanyDto) {
    return `This action updates a #${id} paymentCompany`;
  }

  remove(id: number) {
    return `This action removes a #${id} paymentCompany`;
  }
}
