import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyImageDto } from './dto/create-company-image.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyImage } from './entities/company-image.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Repository } from 'typeorm';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';

@Injectable()
export class CompanyImagesService {
  constructor(
    @InjectRepository(CompanyImage)
    private readonly companyImageRepository: Repository<CompanyImage>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  private async assertCompanyOwnedBy(
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
    createCompanyImageDto: CreateCompanyImageDto,
    ownerPublicId: string,
  ) {
    await this.assertCompanyOwnedBy(
      createCompanyImageDto.company_id,
      ownerPublicId,
    );
    return this.companyImageRepository.save(createCompanyImageDto);
  }

  async findAll(companyId: number, ownerPublicId: string) {
    await this.assertCompanyOwnedBy(companyId, ownerPublicId);
    return this.companyImageRepository.find({
      where: { company_id: companyId },
    });
  }

  async remove(id: number, ownerPublicId: string) {
    const image = await this.companyImageRepository.findOne({
      where: { id },
    });
    if (!image) {
      throw new NotFoundException('Imagem não encontrada.');
    }
    await this.assertCompanyOwnedBy(image.company_id, ownerPublicId);
    return this.companyImageRepository.delete(id);
  }
}
