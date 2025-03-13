import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  create(createCompanyDto: CreateCompanyDto) {
    const company = this.companiesRepository.create(createCompanyDto);
    return this.companiesRepository.save(company);
  }

  findAll() {
    return this.companiesRepository.find();
  }

  findOne(id: number) {
    return this.companiesRepository.findOne({
      where: { id },
      relations: ['administrator', 'images'],
      select: {
        administrator: {
          id: true,
          name: true,
        },
        images: {
          url: true,
        },
      },
    });
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.companiesRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException();
    }
    this.companiesRepository.merge(company, updateCompanyDto);
    return this.companiesRepository.save(company);
  }

  remove(id: number) {
    return this.companiesRepository.delete({ id });
  }
}
