import { Injectable } from '@nestjs/common';
import { CreateCompanyImageDto } from './dto/create-company-image.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyImage } from './entities/company-image.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CompanyImagesService {
  constructor(
    @InjectRepository(CompanyImage)
    private readonly companyImageRepository: Repository<CompanyImage>,
  ) {}

  create(createCompanyImageDto: CreateCompanyImageDto) {
    return this.companyImageRepository.save(createCompanyImageDto);
  }

  findAll(companyId: number) {
    return this.companyImageRepository.find({
      where: { company_id: companyId },
    });
  }

  remove(id: number) {
    return this.companyImageRepository.delete(id);
  }
}
