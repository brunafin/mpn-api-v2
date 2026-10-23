import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { City } from 'src/cities/entities/city.entity';
import { Company } from 'src/companies/entities/company.entity';
import { CreateBatchGoogleCourtDto } from './dto/createBatch-google_court.dto';
import { CreateGoogleCourtDto } from './dto/create-google_court.dto';
import { ImportGoogleCourtsDto } from './dto/import-google_courts.dto';
import { ListGoogleCourtsQueryDto } from './dto/list-google_courts-query.dto';
import { SearchGoogleCourtsDto } from './dto/search-google_courts.dto';
import { UpdateGoogleCourtOutreachDto } from './dto/update-google_court.dto';
import { GoogleCourt } from './entities/google_court.entity';
import { CourtCompetitor } from './enums/competitor.enum';
import { OutreachStatus } from './enums/outreach-status.enum';
import {
  detectCompetitor,
  isRelevantPlace,
  namesLookAlike,
  normalizeName,
  addressConflictsWithCity,
  parseCityUfFromAddress,
  phoneDigits,
  PlacesSearchPlace,
  previewFromPlace,
  previewToPlace,
  resolvePlaceCity,
  type PlacePreview,
} from './google-court.helpers';
import { GooglePlacesClient } from './google-places.client';

const DEFAULT_SEARCH_TERMS = ['quadra esportiva', 'society'];

export type GoogleCourtResponse = {
  googlePlaceId: string;
  name: string;
  phone: string | null;
  fullAddress: string | null;
  city: string | null;
  uf: string | null;
  website: string | null;
  googleMapsUri: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  competitor: CourtCompetitor;
  outreachStatus: OutreachStatus;
  notes: string | null;
  contactedAt: Date | null;
  alreadyRegistered: boolean;
  matchedCompanyPublicId: string | null;
  lastCheckedAt: Date | null;
};

export type GoogleCourtListResponse = {
  items: GoogleCourtResponse[];
  total: number;
  page: number;
  limit: number;
  counts: Record<OutreachStatus, number>;
};

export type GoogleCourtSearchHit = {
  googlePlaceId: string;
  name: string;
  phone: string | null;
  fullAddress: string | null;
  city: string | null;
  uf: string | null;
  website: string | null;
  googleMapsUri: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  latitude: number | null;
  longitude: number | null;
  competitor: CourtCompetitor;
  inPortfolio: boolean;
  outreachStatus: OutreachStatus | null;
  alreadyRegistered: boolean;
  matchedCompanyPublicId: string | null;
};

export type GoogleCourtSearchResponse = {
  city: string;
  uf: string;
  found: number;
  skipped: number;
  alreadyInPortfolio: number;
  outsideCity: number;
  items: GoogleCourtSearchHit[];
};

@Injectable()
export class GoogleCourtsService {
  constructor(
    @InjectRepository(GoogleCourt)
    private readonly googleCourtRepository: Repository<GoogleCourt>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly googlePlacesClient: GooglePlacesClient,
  ) {}

  async list(query: ListGoogleCourtsQueryDto): Promise<GoogleCourtListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const qb = this.googleCourtRepository.createQueryBuilder('court');

    if (query.q?.trim()) {
      const term = `%${query.q.trim()}%`;
      qb.andWhere(
        '(court.name ILIKE :term OR court.phone ILIKE :term OR court.full_address ILIKE :term)',
        { term },
      );
    }
    if (query.city?.trim()) {
      qb.andWhere('court.city ILIKE :city', { city: query.city.trim() });
    }
    if (query.uf?.trim()) {
      qb.andWhere('TRIM(court.uf) = :uf', { uf: query.uf.trim().toUpperCase() });
    }
    if (query.status) {
      qb.andWhere('court.outreach_status = :status', { status: query.status });
    }
    if (query.competitor) {
      qb.andWhere('court.competitor = :competitor', {
        competitor: query.competitor,
      });
    }

    const [rows, total] = await qb
      .orderBy('court.city', 'ASC')
      .addOrderBy('court.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    await this.refreshMatches(rows);

    const counts = await this.countByStatus({
      q: query.q,
      city: query.city,
      uf: query.uf,
      competitor: query.competitor,
    });

    return {
      items: rows.map((row) => this.mapCourt(row)),
      total,
      page,
      limit,
      counts,
    };
  }

  async findOne(googlePlaceId: string): Promise<GoogleCourtResponse> {
    const court = await this.findOrFail(googlePlaceId);
    await this.refreshMatches([court]);
    return this.mapCourt(court);
  }

  async listCities(): Promise<Array<{ city: string; uf: string | null; count: number }>> {
    const rows = await this.googleCourtRepository
      .createQueryBuilder('court')
      .select('court.city', 'city')
      .addSelect('court.uf', 'uf')
      .addSelect('COUNT(*)', 'count')
      .where('court.city IS NOT NULL')
      .andWhere("court.city <> ''")
      .groupBy('court.city')
      .addGroupBy('court.uf')
      .orderBy('court.city', 'ASC')
      .getRawMany<{ city: string; uf: string | null; count: string }>();

    return rows.map((row) => ({
      city: row.city,
      uf: row.uf,
      count: Number(row.count),
    }));
  }

  async updateOutreach(
    googlePlaceId: string,
    dto: UpdateGoogleCourtOutreachDto,
  ): Promise<GoogleCourtResponse> {
    const court = await this.findOrFail(googlePlaceId);

    if (dto.outreachStatus !== undefined) {
      court.outreach_status = dto.outreachStatus;
    }
    if (dto.competitor !== undefined) {
      court.competitor = dto.competitor;
    }
    if (dto.notes !== undefined) {
      court.notes = dto.notes.trim() || null;
    }
    if (dto.city !== undefined) {
      court.city = dto.city.trim() || null;
    }
    if (dto.uf !== undefined) {
      const uf = dto.uf.trim().toUpperCase();
      court.uf = uf || null;
    }
    if (dto.markContacted) {
      court.contacted_at = new Date();
      if (
        court.outreach_status === OutreachStatus.NEW ||
        court.outreach_status === OutreachStatus.SKIP
      ) {
        court.outreach_status = OutreachStatus.CONTACTED;
      }
    }

    const saved = await this.googleCourtRepository.save(court);
    return this.mapCourt(saved);
  }

  async searchCity(dto: SearchGoogleCourtsDto): Promise<GoogleCourtSearchResponse> {
    const city = dto.city.trim();
    const uf = dto.uf.trim().toUpperCase();
    const maxPages = dto.maxPages ?? 2;
    const terms = [...DEFAULT_SEARCH_TERMS, ...(dto.queries || [])]
      .map((term) => term.trim())
      .filter(Boolean)
      .filter(
        (term, index, all) =>
          all.findIndex((item) => item.toLowerCase() === term.toLowerCase()) ===
          index,
      );

    const placesById = new Map<string, PlacesSearchPlace>();
    const seenIds = new Set<string>();
    let skipped = 0;

    for (const term of terms) {
      const query = `${term} em ${city} ${uf}`;
      const places = await this.googlePlacesClient.searchAllPages(
        query,
        maxPages,
      );
      for (const place of places) {
        if (!place.id || seenIds.has(place.id)) continue;
        seenIds.add(place.id);
        if (!isRelevantPlace(place)) {
          skipped += 1;
          continue;
        }
        placesById.set(place.id, place);
      }
    }

    let outsideCity = 0;
    const previews: PlacePreview[] = [];
    for (const place of placesById.values()) {
      if (addressConflictsWithCity(place.formattedAddress, city, uf)) {
        outsideCity += 1;
        continue;
      }
      const preview = previewFromPlace(place, city, uf);
      if (preview) previews.push(preview);
    }

    const items = await this.annotateSearchHits(previews);
    return {
      city,
      uf,
      found: items.length,
      skipped,
      outsideCity,
      alreadyInPortfolio: items.filter((item) => item.inPortfolio).length,
      items,
    };
  }

  /**
   * A cidade gravada passa a ser a do endereço, quando ele diz outra.
   * Quadra puxada para a cidade da busca, mas com endereço de fora, sai dessa lista.
   */
  async sanitizeLocations(): Promise<{ checked: number; updated: number }> {
    const rows = await this.googleCourtRepository.find();
    const changed: GoogleCourt[] = [];

    for (const row of rows) {
      const parsed = parseCityUfFromAddress(row.full_address);
      if (!parsed.city && !parsed.uf) continue;
      const storedUf = (row.uf || '').trim().toUpperCase();
      const cityDiff =
        Boolean(parsed.city) &&
        normalizeName(parsed.city) !== normalizeName(row.city);
      const ufDiff = Boolean(parsed.uf) && parsed.uf !== storedUf;
      if (!cityDiff && !ufDiff) continue;
      if (parsed.city) row.city = parsed.city;
      if (parsed.uf) row.uf = parsed.uf;
      changed.push(row);
    }

    if (changed.length > 0) {
      await this.googleCourtRepository.save(changed);
    }
    return { checked: rows.length, updated: changed.length };
  }

  async importPlaces(dto: ImportGoogleCourtsDto): Promise<{
    city: string;
    uf: string;
    imported: number;
    updated: number;
    items: GoogleCourtResponse[];
  }> {
    const city = dto.city.trim();
    const uf = dto.uf.trim().toUpperCase();
    const places = dto.places.map((place) =>
      previewToPlace({
        googlePlaceId: place.googlePlaceId,
        name: place.name,
        phone: place.phone ?? null,
        fullAddress: place.fullAddress ?? null,
        city,
        uf,
        website: place.website ?? null,
        googleMapsUri: place.googleMapsUri ?? null,
        rating: place.rating ?? null,
        userRatingsTotal: place.userRatingsTotal ?? null,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
        competitor: detectCompetitor(place.website),
      }),
    );

    const { rows, imported, updated } = await this.upsertPlaces(
      places,
      city,
      uf,
    );
    await this.refreshMatches(rows);

    return {
      city,
      uf,
      imported,
      updated,
      items: rows.map((row) => this.mapCourt(row)),
    };
  }

  async create(dto: CreateGoogleCourtDto): Promise<GoogleCourtResponse> {
    const { rows } = await this.upsertPlaces(
      [
        {
          id: dto.googlePlaceId,
          displayName: { text: dto.name },
          nationalPhoneNumber: dto.phone,
          formattedAddress: dto.fullAddress,
        },
      ],
      null,
      null,
    );
    return this.mapCourt(rows[0]);
  }

  async createBatch(dto: CreateBatchGoogleCourtDto): Promise<{
    city: string;
    imported: number;
  }> {
    const parsed = parseCityUfFromAddress(dto.city);
    const city = dto.city.trim();
    const uf = (dto.uf || parsed.uf || '').toUpperCase() || null;
    const places = (dto.places || []).filter((place) => place.id);

    const { rows } = await this.upsertPlaces(places, city, uf);

    const cityRow = await this.cityRepository.findOne({
      where: { name: ILike(city) },
    });
    if (cityRow) {
      cityRow.is_active = false;
      cityRow.dt_last_check = new Date();
      await this.cityRepository.save(cityRow);
    }

    return { city, imported: rows.length };
  }

  private async upsertPlaces(
    places: PlacesSearchPlace[],
    city: string | null,
    uf: string | null,
  ): Promise<{ rows: GoogleCourt[]; imported: number; updated: number }> {
    if (places.length === 0) {
      return { rows: [], imported: 0, updated: 0 };
    }

    const ids = places.map((place) => place.id).filter(Boolean) as string[];
    if (ids.length === 0) {
      return { rows: [], imported: 0, updated: 0 };
    }
    const existing = await this.googleCourtRepository.find({
      where: { google_place_id: In(ids) },
    });
    const existingById = new Map(
      existing.map((row) => [row.google_place_id, row]),
    );
    const now = new Date();
    const toSave: GoogleCourt[] = [];

    for (const place of places) {
      if (!place.id) continue;
      const resolved = resolvePlaceCity(
        place.formattedAddress,
        city,
        uf,
      );
      const website = place.websiteUri || null;
      const detected = detectCompetitor(website);
      const current = existingById.get(place.id);
      const row = current ?? this.googleCourtRepository.create();

      row.google_place_id = place.id;
      row.name = place.displayName?.text?.trim() || row.name || 'Sem nome';
      row.phone = phoneDigits(place.nationalPhoneNumber) || row.phone || null;
      row.full_address = place.formattedAddress || row.full_address || null;
      if (!current || !row.city) {
        row.city = resolved.city || row.city || null;
      }
      if (!current || !row.uf) {
        row.uf = resolved.uf || row.uf || null;
      }
      row.website = website;
      row.google_maps_uri = place.googleMapsUri || row.google_maps_uri || null;
      row.latitude = place.location?.latitude ?? row.latitude ?? null;
      row.longitude = place.location?.longitude ?? row.longitude ?? null;
      row.rating = place.rating ?? row.rating ?? null;
      row.user_ratings_total =
        place.userRatingCount ?? row.user_ratings_total ?? null;
      row.dt_last_check = now;

      if (!current) {
        row.outreach_status = OutreachStatus.NEW;
        row.competitor = detected;
        row.already_registered = false;
      } else if (
        current.competitor === CourtCompetitor.UNKNOWN &&
        detected !== CourtCompetitor.UNKNOWN
      ) {
        row.competitor = detected;
      }

      toSave.push(row);
    }

    const rows = await this.googleCourtRepository.save(toSave);
    const imported = toSave.filter(
      (row) => !existingById.has(row.google_place_id),
    ).length;
    return {
      rows,
      imported,
      updated: rows.length - imported,
    };
  }

  private async annotateSearchHits(
    hits: PlacePreview[],
  ): Promise<GoogleCourtSearchHit[]> {
    if (hits.length === 0) return [];

    const ids = hits.map((hit) => hit.googlePlaceId);
    const existing = await this.googleCourtRepository.find({
      where: { google_place_id: In(ids) },
    });
    await this.refreshMatches(existing);
    const existingById = new Map(
      existing.map((row) => [row.google_place_id, row]),
    );
    const companies = await this.companyRepository.find({
      select: {
        id: true,
        public_id: true,
        name: true,
        phone: true,
        city: true,
      },
    });

    return hits.map((hit) => {
      const saved = existingById.get(hit.googlePlaceId);
      if (saved) {
        return {
          ...hit,
          inPortfolio: true,
          outreachStatus: saved.outreach_status,
          alreadyRegistered: saved.already_registered,
          matchedCompanyPublicId: saved.matched_company_public_id,
          competitor: saved.competitor,
        };
      }

      const match = companies.find((company) => {
        const samePhone =
          Boolean(hit.phone) &&
          phoneDigits(company.phone) === phoneDigits(hit.phone);
        const sameName =
          namesLookAlike(company.name, hit.name) &&
          (!hit.city ||
            !company.city ||
            normalizeLoose(company.city) === normalizeLoose(hit.city));
        return samePhone || sameName;
      });

      return {
        ...hit,
        inPortfolio: false,
        outreachStatus: null,
        alreadyRegistered: Boolean(match),
        matchedCompanyPublicId: match?.public_id ?? null,
      };
    });
  }

  private async refreshMatches(courts: GoogleCourt[]): Promise<void> {
    if (courts.length === 0) return;
    const companies = await this.companyRepository.find({
      select: {
        id: true,
        public_id: true,
        name: true,
        phone: true,
        city: true,
      },
    });
    const changed: GoogleCourt[] = [];

    for (const court of courts) {
      const match = companies.find((company) => {
        const samePhone =
          Boolean(court.phone) &&
          phoneDigits(company.phone) === phoneDigits(court.phone);
        const sameName =
          namesLookAlike(company.name, court.name) &&
          (!court.city ||
            !company.city ||
            normalizeLoose(company.city) === normalizeLoose(court.city));
        return samePhone || sameName;
      });

      const matchedId = match?.public_id ?? null;
      const already = Boolean(match);
      if (
        court.matched_company_public_id !== matchedId ||
        court.already_registered !== already
      ) {
        court.matched_company_public_id = matchedId;
        court.already_registered = already;
        if (already && court.outreach_status === OutreachStatus.NEW) {
          court.outreach_status = OutreachStatus.WON;
        }
        changed.push(court);
      }
    }

    if (changed.length > 0) {
      await this.googleCourtRepository.save(changed);
    }
  }

  private async countByStatus(filters: {
    q?: string;
    city?: string;
    uf?: string;
    competitor?: CourtCompetitor;
  }): Promise<Record<OutreachStatus, number>> {
    const qb = this.googleCourtRepository
      .createQueryBuilder('court')
      .select('court.outreach_status', 'status')
      .addSelect('COUNT(*)', 'count');

    if (filters.q?.trim()) {
      const term = `%${filters.q.trim()}%`;
      qb.andWhere(
        '(court.name ILIKE :term OR court.phone ILIKE :term OR court.full_address ILIKE :term)',
        { term },
      );
    }
    if (filters.city?.trim()) {
      qb.andWhere('court.city ILIKE :city', { city: filters.city.trim() });
    }
    if (filters.uf?.trim()) {
      qb.andWhere('TRIM(court.uf) = :uf', { uf: filters.uf.trim().toUpperCase() });
    }
    if (filters.competitor) {
      qb.andWhere('court.competitor = :competitor', {
        competitor: filters.competitor,
      });
    }

    const rows = await qb
      .groupBy('court.outreach_status')
      .getRawMany<{ status: OutreachStatus; count: string }>();

    const counts = Object.fromEntries(
      Object.values(OutreachStatus).map((status) => [status, 0]),
    ) as Record<OutreachStatus, number>;

    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }

  private async findOrFail(googlePlaceId: string): Promise<GoogleCourt> {
    const court = await this.googleCourtRepository.findOne({
      where: { google_place_id: googlePlaceId },
    });
    if (!court) {
      throw new NotFoundException('Quadra do Google não encontrada.');
    }
    return court;
  }

  private mapCourt(court: GoogleCourt): GoogleCourtResponse {
    return {
      googlePlaceId: court.google_place_id,
      name: court.name,
      phone: court.phone,
      fullAddress: court.full_address,
      city: court.city,
      uf: court.uf,
      website: court.website,
      googleMapsUri: court.google_maps_uri,
      rating: court.rating == null ? null : Number(court.rating),
      userRatingsTotal: court.user_ratings_total,
      competitor: court.competitor,
      outreachStatus: court.outreach_status,
      notes: court.notes,
      contactedAt: court.contacted_at,
      alreadyRegistered: court.already_registered,
      matchedCompanyPublicId: court.matched_company_public_id,
      lastCheckedAt: court.dt_last_check,
    };
  }
}

function normalizeLoose(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
