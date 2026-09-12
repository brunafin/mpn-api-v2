import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { City } from 'src/cities/entities/city.entity';
import { Company } from 'src/companies/entities/company.entity';
import { GoogleCourt } from './entities/google_court.entity';
import { OutreachStatus } from './enums/outreach-status.enum';
import { GooglePlacesClient } from './google-places.client';
import { GoogleCourtsService } from './google_courts.service';

describe('GoogleCourtsService', () => {
  let service: GoogleCourtsService;
  const courtRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((value) => value ?? {}),
  };
  const cityRepo = { findOne: jest.fn(), save: jest.fn() };
  const companyRepo = { find: jest.fn() };
  const placesClient = {
    searchAllPages: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        GoogleCourtsService,
        { provide: getRepositoryToken(GoogleCourt), useValue: courtRepo },
        { provide: getRepositoryToken(City), useValue: cityRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: GooglePlacesClient, useValue: placesClient },
      ],
    }).compile();
    service = module.get(GoogleCourtsService);
  });

  it('searchCity não grava no portfólio e marca quem já está lá', async () => {
    placesClient.searchAllPages.mockResolvedValue([
      {
        id: 'place-new',
        displayName: { text: 'Society Novo' },
        nationalPhoneNumber: '(19) 98888-0001',
        formattedAddress: 'Rua A, Campinas - SP',
      },
      {
        id: 'place-old',
        displayName: { text: 'Arena Antiga' },
        nationalPhoneNumber: '(19) 98888-0002',
        formattedAddress: 'Rua B, Campinas - SP',
      },
      {
        id: 'place-padaria',
        displayName: { text: 'Padaria Central' },
        types: ['bakery'],
      },
    ]);
    courtRepo.find.mockResolvedValue([
      {
        google_place_id: 'place-old',
        name: 'Arena Antiga',
        outreach_status: OutreachStatus.CONTACTED,
        notes: 'Já mandei Zap',
        competitor: 'unknown',
        already_registered: false,
        matched_company_public_id: null,
      },
    ]);
    companyRepo.find.mockResolvedValue([]);

    const result = await service.searchCity({ city: 'Campinas', uf: 'SP' });

    expect(result.found).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.alreadyInPortfolio).toBe(1);
    expect(courtRepo.save).not.toHaveBeenCalled();
    const old = result.items.find((item) => item.googlePlaceId === 'place-old');
    const fresh = result.items.find((item) => item.googlePlaceId === 'place-new');
    expect(old).toMatchObject({
      inPortfolio: true,
      outreachStatus: OutreachStatus.CONTACTED,
    });
    expect(fresh).toMatchObject({
      inPortfolio: false,
      outreachStatus: null,
    });
  });

  it('importPlaces puxa só as quadras escolhidas', async () => {
    courtRepo.find.mockResolvedValue([]);
    courtRepo.save.mockImplementation(async (rows: GoogleCourt[]) => rows);
    companyRepo.find.mockResolvedValue([]);

    const result = await service.importPlaces({
      city: 'Campinas',
      uf: 'SP',
      places: [
        {
          googlePlaceId: 'place-new',
          name: 'Society Novo',
          phone: '19988880001',
          fullAddress: 'Rua A, Campinas - SP',
        },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.items[0].googlePlaceId).toBe('place-new');
    expect(courtRepo.save).toHaveBeenCalled();
  });

  it('updateOutreach marca contato sem rebaixar interessado', async () => {
    courtRepo.findOne.mockResolvedValue({
      google_place_id: 'place-1',
      outreach_status: OutreachStatus.INTERESTED,
      contacted_at: null,
    });
    courtRepo.save.mockImplementation(async (row: GoogleCourt) => row);

    const updated = await service.updateOutreach('place-1', {
      markContacted: true,
    });

    expect(updated.outreachStatus).toBe(OutreachStatus.INTERESTED);
    expect(updated.contactedAt).toBeInstanceOf(Date);
  });

  it('Places client avisa quando a chave não está configurada', () => {
    const previous = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    const client = new GooglePlacesClient();
    expect(() => client.assertConfigured()).toThrow(
      ServiceUnavailableException,
    );
    process.env.GOOGLE_PLACES_API_KEY = previous;
  });
});
