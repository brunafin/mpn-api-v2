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
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) { }

  create(createCompanyDto: CreateCompanyDto) {
    const company = this.companiesRepository.create(createCompanyDto);
    return this.companiesRepository.save(company);
  }

  async findAll() {
    const list = await this.companiesRepository.find();
    return plainToInstance(Company, list, {
      excludeExtraneousValues: true,
    });
  }

  async findOneByPublicId(uuid: string) {
    const company = await this.companiesRepository.findOne({
      where: { public_id: uuid },
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

    if (!company) {
      throw new NotFoundException();
    }

    return plainToInstance(Company, company, {
      exposeUnsetFields: true,
    });
  }

  async updateByPublicId(publicId: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.companiesRepository.findOne({ where: { public_id: publicId } });
    if (!company) {
      throw new NotFoundException();
    }
    this.companiesRepository.merge(company, updateCompanyDto);
    return this.companiesRepository.save(company);
  }

  removeByPublicId(publicId: string) {
    return this.companiesRepository.delete({ public_id: publicId });
  }
}
