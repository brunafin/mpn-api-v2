import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourtDto } from './dto/create-court.dto';
import { CreateOwnedCourtDto } from './dto/create-owned-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Court } from './entities/court.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Repository } from 'typeorm';
import { Sport } from 'src/sports/entities/sport.entity';
import { resolveSportsByName } from 'src/sports/resolve-sports';
import { assertAdministratorOwns } from 'src/common/tenancy/assert-administrator-owns';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { CourtSchedulesService } from 'src/court-schedules/court-schedules.service';
import { addDaysToDateKey, todayDateKey } from 'src/utils/calendarDate';

@Injectable()
export class CourtsService {
  constructor(
    @InjectRepository(Court)
    private readonly courtRepository: Repository<Court>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly publicListingCache: PublicListingCache,
    private readonly courtSchedulesService: CourtSchedulesService,
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

  async createOwned(
    companyPublicId: string,
    ownerPublicId: string,
    dto: CreateOwnedCourtDto,
  ) {
    const company = await this.assertCompanyPublicIdOwnedBy(
      companyPublicId,
      ownerPublicId,
    );

    const sports = await resolveSportsByName(
      this.courtRepository.manager.getRepository(Sport),
      dto.sports,
    );

    const source = await this.findScheduleSourceCourt(
      company.id,
      dto.copyFromCourtPublicId,
    );
    const sourceRows = await this.courtRepository.manager
      .getRepository(OperatingSchedule)
      .find({ where: { court_id: source.id } });
    if (sourceRows.length === 0) {
      throw new BadRequestException(
        'Não há grade para copiar. Configure o horário na agenda.',
      );
    }

    const court = await this.courtRepository.save(
      this.courtRepository.create({
        name: dto.name.trim(),
        company_id: company.id,
        floor: dto.floor,
        is_covered: dto.is_covered ?? true,
        is_can_have_net: dto.is_can_have_net ?? false,
        show: false,
        court_sports: sports,
      }),
    );

    await this.courtRepository.manager.getRepository(OperatingSchedule).save(
      sourceRows.map((row) =>
        this.courtRepository.manager.getRepository(OperatingSchedule).create({
          court_id: court.id,
          day_of_week_id: row.day_of_week_id,
          hour: row.hour,
          price: dto.price,
          is_active: row.is_active,
          is_fixed: false,
          is_public: row.is_public !== false,
          sport_id: null,
          fixed_contact_name: null,
          fixed_contact_phone: null,
        }),
      ),
    );

    const today = todayDateKey();
    let schedulesReady = true;
    try {
      await this.courtSchedulesService.populateCourtSchedule(
        court.id,
        today,
        today,
      );
    } catch (error) {
      schedulesReady = false;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[Courts] Falha ao popular o dia atual da quadra ${court.id}:`,
        message,
      );
    }
    void this.populateHorizon(court.id);

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: company.public_id,
      companySlug: company.slug,
      allAgendaDays: true,
    });

    return {
      publicId: court.public_id,
      name: court.name,
      schedulesReady,
    };
  }

  private async findScheduleSourceCourt(
    companyId: number,
    copyFromCourtPublicId?: string,
  ): Promise<Court> {
    if (copyFromCourtPublicId) {
      const source = await this.courtRepository.findOne({
        where: {
          public_id: copyFromCourtPublicId,
          company_id: companyId,
        },
      });
      if (!source) {
        throw new NotFoundException('Quadra de origem não encontrada.');
      }
      return source;
    }

    const courts = await this.courtRepository.find({
      where: { company_id: companyId },
      order: { id: 'ASC' },
    });
    for (const court of courts) {
      const osCount = await this.courtRepository.manager
        .getRepository(OperatingSchedule)
        .count({ where: { court_id: court.id } });
      if (osCount > 0) return court;
    }
    throw new BadRequestException(
      'Não há grade para copiar. Configure o horário na agenda.',
    );
  }

  private async populateHorizon(courtId: number, attempts = 2) {
    const start = addDaysToDateKey(todayDateKey(), 1);
    const end = addDaysToDateKey(todayDateKey(), 89);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await this.courtSchedulesService.populateCourtSchedule(
          courtId,
          start,
          end,
        );
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[Courts] Falha ao popular horizonte da quadra ${courtId} (tentativa ${attempt}/${attempts}):`,
          message,
        );
      }
    }
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
      court.court_sports = await resolveSportsByName(
        this.courtRepository.manager.getRepository(Sport),
        updateCourtDto.sports,
      );
    }

    const saved = await this.courtRepository.save(court);

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: court.company.public_id,
      companySlug: court.company.slug,
      allAgendaDays: true,
    });

    return saved;
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
