import { PartialType } from '@nestjs/swagger';
import { CreateCompaniesCustomerDto } from './create-companies-customer.dto';

export class UpdateCompaniesCustomerDto extends PartialType(CreateCompaniesCustomerDto) {}
