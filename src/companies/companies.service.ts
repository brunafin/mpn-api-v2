import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { In, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { getStatusCourtSchedule } from 'src/utils/getStatusCourtSchedulet';
import { ReservationStatusEnum } from 'src/court-schedules/court-schedules.service';
import { format } from 'date-fns';
import { StorageService } from 'src/storage/storage.service';
import { CompanyImage } from 'src/company-images/entities/company-image.entity';
import { randomUUID } from 'crypto';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { computeMonthlyFee, quotePlanPrices } from 'src/plans/utils/compute-monthly-fee';
import { PartnerStatus } from 'src/companies/enums/partner-status.enum';
import { TrialExpiryService } from 'src/companies/trial-expiry.service';
import { buildCapabilities } from 'src/companies/utils/company-access';
import {
  COMPANY_PHOTO_MAX_COUNT,
  IMAGE_UPLOAD_MAX_BYTES,
  IMAGE_UPLOAD_MIME_TO_EXT,
  imageUploadTooLargeMessage,
} from './company-image-upload';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { PeopleService } from 'src/people/people.service';

export interface IReservationItemProps {
  scheduleId: string;
  status: ReservationStatusEnum;
  date: string;
  court: string;
  time: string;
  customerName: string | null;
  isBarbecueIncluded?: boolean;
  isEvent?: boolean;
  isNeedsNetting?: boolean;
  isHiddenInactiveHours?: boolean;
  /**
   * Visibilidade no portal via OperatingSchedule.
   * true = público; false = interno; null = sem OS (órfão / quick-create).
   */
  isPublic?: boolean | null;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(CompanyImage)
    private readonly companyImageRepository: Repository<CompanyImage>,
    @InjectRepository(OperatingSchedule)
    private readonly operatingScheduleRepository: Repository<OperatingSchedule>,
    private readonly storageService: StorageService,
    private readonly publicListingCache: PublicListingCache,
    private readonly peopleService: PeopleService,
    private readonly trialExpiryService: TrialExpiryService,
  ) {}

  /**
   * Legado: criação fora do onboarding.
   * administrator_id do body é ignorado — sempre o JWT autenticado.
   */
  async createForOwner(
    createCompanyDto: CreateCompanyDto,
    ownerPublicId: string,
  ) {
    const person =
      await this.peopleService.findByPublicIdWithCompanies(ownerPublicId);
    if (!person) {
      throw new UnauthorizedException('Não autorizado.');
    }
    const { administrator_id: _ignored, ...safeCreate } =
      createCompanyDto as CreateCompanyDto & { administrator_id?: number };
    const company = this.companiesRepository.create({
      ...safeCreate,
      administrator_id: person.id,
    });
    return this.companiesRepository.save(company);
  }

  async findAll() {
    const list = await this.companiesRepository.find();
    return plainToInstance(Company, list, {
      excludeExtraneousValues: true,
    });
  }

  async findAllForOwner(ownerPublicId: string) {
    const list = await this.companiesRepository.find({
      where: { administrator: { public_id: ownerPublicId } },
      relations: ['administrator'],
    });
    return plainToInstance(Company, list, {
      excludeExtraneousValues: true,
    });
  }

  async findOneByPublicId(uuid: string, ownerPublicId: string) {
    await this.assertCompanyOwnedBy(uuid, ownerPublicId);
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

  async findSchedulesByDate(
    publicId: string,
    date: string,
    ownerPublicId: string,
  ): Promise<IReservationItemProps[]> {
    await this.assertCompanyOwnedBy(publicId, ownerPublicId);
    const dateKey =
      typeof date === 'string'
        ? date.slice(0, 10)
        : new Date(date).toISOString().split('T')[0];
    const cacheKey = `agenda:${publicId}:${dateKey}`;

    return this.publicListingCache.getOrSet(
      cacheKey,
      () => this.loadSchedulesByDate(publicId, dateKey, false),
      this.publicListingCache.agendaTtlMs,
    );
  }

  async findAllSchedulesByDate(
    publicId: string,
    date: string,
    ownerPublicId: string,
  ): Promise<{ schedules: IReservationItemProps[]; isDayClosed: boolean }> {
    await this.assertCompanyOwnedBy(publicId, ownerPublicId);
    const dateKey =
      typeof date === 'string'
        ? date.slice(0, 10)
        : new Date(date).toISOString().split('T')[0];
    const cacheKey = `agenda-all:${publicId}:${dateKey}`;

    return this.publicListingCache.getOrSet(
      cacheKey,
      () => this.loadAllSchedulesByDate(publicId, dateKey),
      this.publicListingCache.agendaTtlMs,
    );
  }

  private async loadAllSchedulesByDate(
    publicId: string,
    dateKey: string,
  ): Promise<{ schedules: IReservationItemProps[]; isDayClosed: boolean }> {
    const schedules = await this.loadSchedulesByDate(publicId, dateKey, true);
    // isDayClosed legado: sempre false (closed_by_day removido).
    return {
      schedules,
      isDayClosed: false,
    };
  }

  private async loadSchedulesByDate(
    publicId: string,
    dateKey: string,
    includeHiddenInactive: boolean,
  ): Promise<IReservationItemProps[]> {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.courts', 'court')
      .leftJoinAndSelect(
        'court.court_schedule',
        'schedule',
        'schedule.date = :date',
        { date: dateKey },
      )
      .leftJoinAndSelect('schedule.reservation', 'reservation')
      .leftJoinAndSelect('reservation.sport', 'sport')
      .where('company.public_id = :publicId', { publicId })
      .andWhere('schedule.id IS NOT NULL')
      .select([
        'company.id',
        'company.public_id',
        'company.preferences_is_hidden_inactive_hours',
        'court.id',
        'court.public_id',
        'court.name',
        'schedule.public_id',
        'schedule.start_hour',
        'schedule.date',
        'schedule.available',
        'schedule.price',
        'schedule.is_fixed',
        'schedule.day_of_week_id',
        'schedule.court_id',
        'reservation.id',
        'reservation.public_id',
        'reservation.contact_name',
        'reservation.contact_phone',
        'reservation.created_at',
        'reservation.observation',
        'reservation.is_barbecue_included',
        'reservation.is_event',
        'sport.needsNet',
      ])
      .getOne();

    const courtIds =
      company?.courts?.map((court) => court.id).filter(Boolean) ?? [];
    const publicByOsKey = new Map<string, boolean>();
    if (courtIds.length > 0) {
      const operatingRows = await this.operatingScheduleRepository.find({
        where: { court_id: In(courtIds) },
        select: {
          court_id: true,
          day_of_week_id: true,
          hour: true,
          is_public: true,
        },
      });
      for (const os of operatingRows) {
        publicByOsKey.set(
          `${os.court_id}|${os.day_of_week_id}|${String(os.hour).slice(0, 5)}`,
          os.is_public !== false,
        );
      }
    }

    const reservations: IReservationItemProps[] =
      company?.courts
        .flatMap((court) => {
          const isHiddenInactiveHours =
            company.preferences_is_hidden_inactive_hours;

          return court.court_schedule
            .filter((schedule) => {
              if (includeHiddenInactive) return true;
              const status = getStatusCourtSchedule(schedule);
              return !(
                isHiddenInactiveHours &&
                status === ReservationStatusEnum.INACTIVE
              );
            })
            .map((schedule) => {
              const osKey = `${schedule.court_id}|${schedule.day_of_week_id}|${String(schedule.start_hour).slice(0, 5)}`;
              const isPublic = publicByOsKey.has(osKey)
                ? publicByOsKey.get(osKey)!
                : null;
              return {
                scheduleId: schedule.public_id,
                status: getStatusCourtSchedule(schedule),
                date:
                  typeof schedule.date === 'string'
                    ? String(schedule.date).slice(0, 10)
                    : format(
                        new Date(
                          schedule.date.getTime() +
                            schedule.date.getTimezoneOffset() * 60_000,
                        ),
                        'yyyy-MM-dd',
                      ),
                court: court.name,
                time: schedule.start_hour.slice(0, 5),
                customerName: schedule.reservation?.contact_name ?? null,
                isBarbecueIncluded:
                  schedule.reservation?.is_barbecue_included ?? false,
                isEvent: schedule.reservation?.is_event ?? false,
                isNeedsNetting: schedule.reservation?.sport?.needsNet ?? false,
                isPublic,
                ...(includeHiddenInactive
                  ? { isHiddenInactiveHours }
                  : {}),
              };
            });
        })
        .sort((a, b) => a.time.localeCompare(b.time)) ?? [];

    return reservations ?? [];
  }

  async updateByPublicId(
    publicId: string,
    updateCompanyDto: UpdateCompanyDto,
    ownerPublicId: string,
  ) {
    const company = await this.assertCompanyOwnedBy(publicId, ownerPublicId);
    // Não permitir reatribuir administrador via patch genérico (IDOR/escalação).
    const { administrator_id: _ignored, ...safeUpdate } =
      updateCompanyDto as UpdateCompanyDto & { administrator_id?: number };
    if (safeUpdate.characteristics !== undefined) {
      safeUpdate.characteristics = Array.from(
        new Set(
          (safeUpdate.characteristics ?? [])
            .map((item) => String(item).trim())
            .filter((item) => item.length > 0),
        ),
      );
    }
    this.companiesRepository.merge(company, safeUpdate);
    const saved = await this.companiesRepository.save(company);
    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: company.public_id,
      companySlug: company.slug,
      allAgendaDays: true,
    });
    return saved;
  }

  async removeByPublicId(publicId: string, ownerPublicId: string) {
    await this.assertCompanyOwnedBy(publicId, ownerPublicId);
    return this.companiesRepository.delete({ public_id: publicId });
  }

  async changePreferencesHiddenInactiveHoursByPublicId(
    publicId: string,
    isHiddenInactiveHours: boolean,
    ownerPublicId: string,
  ) {
    await this.assertCompanyOwnedBy(publicId, ownerPublicId);
    const result = await this.companiesRepository.update(
      { public_id: publicId },
      { preferences_is_hidden_inactive_hours: isHiddenInactiveHours },
    );
    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: publicId,
      allAgendaDays: true,
    });
    return result;
  }

  async findInfosByPublicId(uuid: string, ownerPublicId: string) {
    await this.assertCompanyOwnedBy(uuid, ownerPublicId);
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.plan', 'plan')
      .leftJoinAndSelect('company.payments', 'payments')
      .leftJoinAndSelect('company.administrator', 'administrator')
      .leftJoinAndSelect('company.courts', 'courts')
      .leftJoinAndSelect('courts.court_sports', 'court_sports')
      .leftJoinAndSelect('courts.operating_schedule', 'operating_schedule')
      .leftJoinAndSelect('company.images', 'images')
      .where('company.public_id = :uuid', { uuid })
      .select([
        'company.id',
        'company.name',
        'company.phone',
        'company.logo_url',
        'company.instagram_url',
        'company.cep',
        'company.street',
        'company.number',
        'company.neighborhood',
        'company.city',
        'company.uf',
        'company.characteristics',
        'company.slug',
        'company.is_active',
        'company.preferences_is_hidden_inactive_hours',
        'company.day_due',
        'company.trial_ends_at',
        'company.is_trial',
        'company.partner_status',
        'company.plan_id',
        'company.access_mode',
        'company.access_reason',
        'administrator.id',
        'administrator.public_id',
        'administrator.name',
        'administrator.email',
        'administrator.phone',
        'plan.name',
        'plan.base_price',
        'plan.price_per_court',
        'payments.dt_payment',
        'payments.price',
        'payments.form_of_payment',
        'courts.id',
        'courts.public_id',
        'courts.name',
        'courts.floor',
        'courts.show',
        'courts.is_covered',
        'courts.is_can_have_net',
        'court_sports.id',
        'court_sports.name',
        'operating_schedule.hour',
        'operating_schedule.day_of_week_id',
        'operating_schedule.court_id',
        'operating_schedule.price',
        'operating_schedule.is_active',
        'images.id',
        'images.url',
      ])
      .orderBy('payments.dt_payment', 'DESC')
      .addOrderBy('courts.name', 'ASC')
      .addOrderBy('images.id', 'ASC')
      .getOne();

    if (!company) {
      throw new NotFoundException();
    }

    await this.trialExpiryService.expireCompanyIfNeeded(company);

    const today = new Date();
    const fallbackDate = format(
      new Date(today.getFullYear(), today.getMonth(), company.day_due ?? 10),
      'yyyy-MM-dd',
    );

    const courts =
      company.courts?.map((court) => {
        const activePrices = (court.operating_schedule ?? [])
          .filter((slot) => slot.is_active)
          .map((slot) => Number(slot.price));
        const price =
          activePrices.length > 0
            ? activePrices[0]
            : court.operating_schedule?.[0]
              ? Number(court.operating_schedule[0].price)
              : null;

        return {
          publicId: court.public_id,
          name: court.name,
          floor: court.floor,
          show: Boolean(court.show),
          isCovered: Boolean(court.is_covered),
          isCanHaveNet: Boolean(court.is_can_have_net),
          sports: (court.court_sports ?? []).map((sport) => sport.name),
          price,
        };
      }) ?? [];

    const owner = company.administrator
      ? {
          name: company.administrator.name || null,
          email: company.administrator.email || null,
          phone: company.administrator.phone || null,
        }
      : null;

    const capabilities = buildCapabilities(company);

    const objToFront = {
      link: `https://marcapranos.com.br/encontre-onde-jogar/${company.slug}`,
      slug: company.slug,
      /** Publicado no portal (ao menos uma quadra com show=true). */
      isActive: Boolean(company.is_active),
      preferences: {
        isHiddenInactiveHours: company.preferences_is_hidden_inactive_hours,
      },
      companyName: company.name,
      companyPhone: company.phone || null,
      instagramUrl: company.instagram_url || null,
      characteristics: company.characteristics ?? [],
      address: {
        cep: company.cep || null,
        street: company.street || null,
        number: company.number || null,
        neighborhood: company.neighborhood || null,
        city: company.city || null,
        uf: company.uf || null,
      },
      logoUrl: company.logo_url || null,
      photos: (company.images ?? [])
        .slice(0, COMPANY_PHOTO_MAX_COUNT)
        .map((image) => ({ id: image.id, url: image.url })),
      owner,
      courts,
      capabilities,
      plan: {
        name:
          company.partner_status === PartnerStatus.EXPIRED
            ? 'Expirado'
            : company.plan?.name || 'Gratuito (Teste)',
        price: (() => {
          const { basePrice, pricePerCourt } = quotePlanPrices(company.plan);
          return computeMonthlyFee({
            basePrice,
            pricePerCourt,
            courtsCount: courts.length,
          });
        })(),
        day_due: company?.day_due || null,
        isTrial: Boolean(company.is_trial),
        trialEndsAt: company.trial_ends_at
          ? new Date(company.trial_ends_at).toISOString()
          : null,
        history:
          company.payments?.map((payment) => ({
            date: payment.dt_payment ?? fallbackDate,
            value: payment.price,
            form_of_payment: payment.form_of_payment,
            paied: !!payment.dt_payment,
          })) || [],
      },
    };

    return objToFront;
  }

  async uploadLogo(
    companyPublicId: string,
    ownerPublicId: string,
    file: Express.Multer.File,
  ): Promise<{ logoUrl: string }> {
    if (!this.storageService.isConfigured()) {
      throw new ServiceUnavailableException(
        'Upload de logo indisponível: configure o Cloudflare R2.',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envie um arquivo de imagem.');
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(imageUploadTooLargeMessage());
    }
    const extension = IMAGE_UPLOAD_MIME_TO_EXT[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'Formato inválido. Use JPG, PNG ou WebP.',
      );
    }

    const company = await this.companiesRepository.findOne({
      where: { public_id: companyPublicId },
      relations: ['administrator'],
    });
    if (!company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    if (company.administrator?.public_id !== ownerPublicId) {
      throw new ForbiddenException(
        'Você não pode alterar o logo deste estabelecimento.',
      );
    }

    const logoId = randomUUID();
    const key = this.storageService.companyLogoKey(
      company.public_id,
      logoId,
      extension,
    );
    const previousKey = this.storageService.keyFromPublicUrl(company.logo_url);

    const logoUrl = await this.storageService.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    company.logo_url = logoUrl;
    await this.companiesRepository.save(company);

    // Remove logo anterior (mesmo bucket); key antiga fixa ou versionada.
    if (previousKey && previousKey !== key) {
      await this.storageService.deleteObject(previousKey);
    }

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: company.public_id,
      companySlug: company.slug,
      allAgendaDays: true,
    });

    return { logoUrl };
  }

  private async assertCompanyOwnedBy(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { public_id: companyPublicId },
      relations: ['administrator'],
    });
    if (!company) {
      throw new NotFoundException('Estabelecimento não encontrado.');
    }
    if (company.administrator?.public_id !== ownerPublicId) {
      throw new ForbiddenException(
        'Você não tem acesso a este estabelecimento.',
      );
    }
    return company;
  }

  async assertOwnedBy(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<Company> {
    return this.assertCompanyOwnedBy(companyPublicId, ownerPublicId);
  }

  async listPhotos(
    companyPublicId: string,
    ownerPublicId: string,
  ): Promise<{ id: number; url: string }[]> {
    const company = await this.assertCompanyOwnedBy(
      companyPublicId,
      ownerPublicId,
    );
    const images = await this.companyImageRepository.find({
      where: { company_id: company.id },
      order: { id: 'ASC' },
      take: COMPANY_PHOTO_MAX_COUNT,
    });
    return images.map((image) => ({ id: image.id, url: image.url }));
  }

  async uploadPhoto(
    companyPublicId: string,
    ownerPublicId: string,
    file: Express.Multer.File,
  ): Promise<{ id: number; url: string }> {
    if (!this.storageService.isConfigured()) {
      throw new ServiceUnavailableException(
        'Upload de fotos indisponível: configure o Cloudflare R2.',
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envie um arquivo de imagem.');
    }
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(imageUploadTooLargeMessage());
    }
    const extension = IMAGE_UPLOAD_MIME_TO_EXT[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'Formato inválido. Use JPG, PNG ou WebP.',
      );
    }

    const company = await this.assertCompanyOwnedBy(
      companyPublicId,
      ownerPublicId,
    );

    const currentCount = await this.companyImageRepository.count({
      where: { company_id: company.id },
    });
    if (currentCount >= COMPANY_PHOTO_MAX_COUNT) {
      throw new BadRequestException(
        `Você já enviou ${COMPANY_PHOTO_MAX_COUNT} fotos. Remova uma para enviar outra.`,
      );
    }

    const photoId = randomUUID();
    const key = this.storageService.companyPhotoKey(
      company.public_id,
      photoId,
      extension,
    );
    const url = await this.storageService.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const saved = await this.companyImageRepository.save({
      url,
      company_id: company.id,
    });

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: company.public_id,
      companySlug: company.slug,
      allAgendaDays: true,
    });

    return { id: saved.id, url: saved.url };
  }

  async deletePhoto(
    companyPublicId: string,
    ownerPublicId: string,
    imageId: number,
  ): Promise<{ ok: true }> {
    const company = await this.assertCompanyOwnedBy(
      companyPublicId,
      ownerPublicId,
    );

    const image = await this.companyImageRepository.findOne({
      where: { id: imageId, company_id: company.id },
    });
    if (!image) {
      throw new NotFoundException('Foto não encontrada.');
    }

    const key = this.storageService.keyFromPublicUrl(image.url);
    await this.companyImageRepository.delete(image.id);
    if (key) {
      await this.storageService.deleteObject(key);
    }

    this.publicListingCache.invalidateAfterMutation({
      companyPublicId: company.public_id,
      companySlug: company.slug,
      allAgendaDays: true,
    });

    return { ok: true };
  }
}
