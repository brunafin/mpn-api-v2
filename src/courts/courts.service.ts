import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Repository } from 'typeorm';
import { Sport } from 'src/sports/entities/sport.entity';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';
import { PublicListingCache } from 'src/cache/public-listing.cache';

@Injectable()
export class CourtsService {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly publicListingCache: PublicListingCache,
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
    const courts = await this.courtRepository.find({
      where: { company: { public_id: companyPublicId } },
      select: { id: true, name: true, public_id: true },
    });
    // Retorna plain object com `id` (excluído na entity via @Exclude) para o
    // manager usar no select de horário / quick-create.
    return courts.map((court) => ({
      id: court.id,
      name: court.name,
      public_id: court.public_id,
    }));
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

    if (updateCourtDto.name !== undefined) {
      const name = updateCourtDto.name.trim();
      if (!name) {
        throw new BadRequestException('Informe o nome da quadra.');
      }
      court.name = name;
    }
    if (updateCourtDto.floor !== undefined) {
      const floor = updateCourtDto.floor?.trim() || null;
      court.floor = floor;
    }
    if (updateCourtDto.show !== undefined) {
      court.show = updateCourtDto.show;
    }
    if (updateCourtDto.is_covered !== undefined) {
      court.is_covered = updateCourtDto.is_covered;
    }
    if (updateCourtDto.is_can_have_net !== undefined) {
      court.is_can_have_net = updateCourtDto.is_can_have_net;
    }

    if (updateCourtDto.sports !== undefined) {
      const names = Array.from(
        new Set(
          updateCourtDto.sports
            .map((name) => name.trim())
            .filter((name) => name.length > 0),
        ),
      );
      if (names.length === 0) {
        throw new BadRequestException('Informe ao menos um esporte.');
      }
      court.court_sports = await this.resolveSportsByName(names);
    }

    const saved = await this.courtRepository.save(court);

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: court.company.public_id,
      companySlug: court.company.slug,
      allAgendaDays: true,
    });

    return saved;
  }

  private async resolveSportsByName(names: string[]): Promise<Sport[]> {
    const existing = await this.courtRepository.manager.find(Sport);
    const byName = new Map(
      existing.map((sport) => [sport.name.toLowerCase(), sport]),
    );
    const missing = names.filter((name) => !byName.has(name.toLowerCase()));
    if (missing.length > 0) {
      const created = await this.courtRepository.manager.save(
        Sport,
        missing.map((name) =>
          this.courtRepository.manager.create(Sport, {
            name,
            needsNet: false,
          }),
        ),
      );
      for (const sport of created) {
        byName.set(sport.name.toLowerCase(), sport);
      }
    }
    return names.map((name) => byName.get(name.toLowerCase())!);
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

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: court.company.public_id,
      companySlug: court.company.slug,
      allAgendaDays: true,
    });

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
