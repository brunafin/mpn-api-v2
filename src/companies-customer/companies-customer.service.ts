import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyCustomer } from './entities/company-customer.entity';
import { CreateCompaniesCustomerDto } from './dto/create-companies-customer.dto';
import { UpdateCompaniesCustomerDto } from './dto/update-companies-customer.dto';

@Injectable()
export class CompaniesCustomerService {
  constructor(
    @InjectRepository(CompanyCustomer)
    private readonly customerRepository: Repository<CompanyCustomer>,
  ) { }

  async create(createCompaniesCustomerDto: CreateCompaniesCustomerDto): Promise<CompanyCustomer> {
    const existingCustomer = await this.customerRepository.findOne({
      where: {
        name: createCompaniesCustomerDto.name,
        phone: createCompaniesCustomerDto.phone,
      },
    });
    if (existingCustomer) {
      throw new NotFoundException(
        "Usuário já existe",
      );
    }
    const customer = this.customerRepository.create(createCompaniesCustomerDto);
    return this.customerRepository.save(customer);
  }

  async findAll(): Promise<CompanyCustomer[]> {
    return this.customerRepository.find();
  }

  async findOne(id: number): Promise<CompanyCustomer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return customer;
  }

  async update(id: number, updateCompaniesCustomerDto: UpdateCompaniesCustomerDto): Promise<CompanyCustomer> {
    await this.customerRepository.update(id, updateCompaniesCustomerDto);
    const updatedCustomer = await this.customerRepository.findOne({ where: { id } });
    if (!updatedCustomer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return updatedCustomer;
  }

  async remove(id: number): Promise<void> {
    const result = await this.customerRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Cliente não encontrado');
    }
  }
}
