import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Repository } from 'typeorm';
import { Sport } from 'src/sports/entities/sport.entity';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';

@Injectable()
export class CourtsService {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
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

  private async assertCompanyPublicIdOwnedBy(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { public_id: companyPublicId },
      relations: ['administrator'],
    });
    if (!company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    assertAdministratorOwns(company.administrator?.public_id, ownerPublicId);
    return company;
  }

  private async assertCourtOwnedBy(
    courtPublicId: string,
    ownerPublicId: string,
  ): Promise<Court> {
    const court = await this.courtRepository.findOne({
      where: { public_id: courtPublicId },
      relations: { company: { administrator: true } },
    });
    if (!court) {
      throw new NotFoundException('Quadra não encontrada.');
    }
    assertAdministratorOwns(
      court.company?.administrator?.public_id,
      ownerPublicId,
    );
    return court;
  }

  async create(createCourtDto: CreateCourtDto, ownerPublicId: string) {
    await this.assertCompanyIdOwnedBy(createCourtDto.company_id, ownerPublicId);
    const { sports, ...courtData } = createCourtDto;
    const sportsEntities = await this.courtRepository.manager.findByIds(
      Sport,
      sports,
    );

    if (sportsEntities.length !== sports.length) {
      throw new NotFoundException('Um ou mais esportes não encontrados');
    }

    const court = this.courtRepository.create({
      ...courtData,
      court_sports: sportsEntities,
    });

    return this.courtRepository.save(court);
  }

  async findAllByCompanyId(companyPublicId: string, ownerPublicId: string) {
    await this.assertCompanyPublicIdOwnedBy(companyPublicId, ownerPublicId);
    return this.courtRepository.find({
      where: { company: { public_id: companyPublicId } },
    });
  }

  findAllForOwner(ownerPublicId: string) {
    return this.courtRepository.find({
      where: { company: { administrator: { public_id: ownerPublicId } } },
    });
  }

  async findOneByPublicId(publicId: string, ownerPublicId: string) {
    await this.assertCourtOwnedBy(publicId, ownerPublicId);
    return this.courtRepository.findOne({
      where: { public_id: publicId },
      relations: {
        operating_schedule: true,
      },
      select: {
        operating_schedule: {
          hour: true,
          day_of_week_id: true,
          price: true,
        },
      },
    });
  }

  async updateByPublicId(
    publicId: string,
    updateCourtDto: UpdateCourtDto,
    ownerPublicId: string,
  ) {
    const court = await this.assertCourtOwnedBy(publicId, ownerPublicId);
    const { company_id: _ignored, ...safeUpdate } = updateCourtDto as UpdateCourtDto & {
      company_id?: number;
    };
    this.courtRepository.merge(court, safeUpdate);
    return this.courtRepository.save(court);
  }

  async setVisibility(
    courtPublicId: string,
    ownerPublicId: string,
    show: boolean,
  ) {
    const court = await this.assertCourtOwnedBy(courtPublicId, ownerPublicId);

    court.show = show;
    await this.courtRepository.save(court);

    const visibleCount = await this.courtRepository.count({
      where: { company_id: court.company_id, show: true },
    });
    const companyActive = visibleCount > 0;
    await this.companyRepository.update(
      { id: court.company_id },
      { is_active: companyActive },
    );

    return {
      publicId: court.public_id,
      show: court.show,
      companyActive,
    };
  }

  async removeByPublicId(publicId: string, ownerPublicId: string) {
    await this.assertCourtOwnedBy(publicId, ownerPublicId);
    return this.courtRepository.delete({ public_id: publicId });
  }
}
