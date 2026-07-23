import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyCustomer } from './entities/company-customer.entity';
import { CreateCompaniesCustomerDto } from './dto/create-companies-customer.dto';
import { UpdateCompaniesCustomerDto } from './dto/update-companies-customer.dto';
import { Company } from 'src/companies/entities/company.entity';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';

@Injectable()
export class CompaniesCustomerService {
  constructor(
    @InjectRepository(CompanyCustomer)
    private readonly customerRepository: Repository<CompanyCustomer>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  private async assertCompanyIdOwnedBy(
    companyId: number,
    ownerPublicId: string,
  ): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['administrator'],
    });
    if (!company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    assertAdministratorOwns(company.administrator?.public_id, ownerPublicId);
    return company;
  }

  async create(
    createCompaniesCustomerDto: CreateCompaniesCustomerDto,
    ownerPublicId: string,
  ): Promise<CompanyCustomer> {
    await this.assertCompanyIdOwnedBy(
      createCompaniesCustomerDto.company_id,
      ownerPublicId,
    );
    const existingCustomer = await this.customerRepository.findOne({
      where: {
        name: createCompaniesCustomerDto.name.trim(),
        phone: createCompaniesCustomerDto.phone,
        company_id: createCompaniesCustomerDto.company_id,
      },
    });
    if (existingCustomer) {
      throw new NotFoundException('Usuário já existe');
    }
    const customer = this.customerRepository.create(createCompaniesCustomerDto);
    return this.customerRepository.save(customer);
  }

  async findAllByCompany(
    companyId: number,
    ownerPublicId: string,
  ): Promise<Pick<CompanyCustomer, 'id' | 'name' | 'phone' | 'email'>[]> {
    await this.assertCompanyIdOwnedBy(companyId, ownerPublicId);
    return this.customerRepository.find({
      select: ['id', 'name', 'phone', 'email'],
      where: { company_id: companyId },
    });
  }

  async findOne(id: number): Promise<CompanyCustomer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return customer;
  }

  async update(
    id: number,
    updateCompaniesCustomerDto: UpdateCompaniesCustomerDto,
  ): Promise<CompanyCustomer> {
    await this.customerRepository.update(id, updateCompaniesCustomerDto);
    const updatedCustomer = await this.customerRepository.findOne({
      where: { id },
    });
    if (!updatedCustomer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return updatedCustomer;
  }

  async remove(id: number, ownerPublicId: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: { company: { administrator: true } },
    });
    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }
    assertAdministratorOwns(
      customer.company?.administrator?.public_id,
      ownerPublicId,
    );
    await this.customerRepository.delete(id);
  }
}
