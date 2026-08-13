import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { Sport } from 'src/sports/entities/sport.entity';
import { PublicListingCache } from 'src/cache/public-listing.cache';
import { CourtSchedulesService } from 'src/court-schedules/court-schedules.service';
import { Court } from './entities/court.entity';
import { CourtsService } from './courts.service';

describe('CourtsService', () => {
  let service: CourtsService;
  let courtRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    manager: {
      getRepository: jest.Mock;
    };
  };
  let companyRepo: { findOne: jest.Mock };
  let sportRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let osRepo: {
    find: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let courtSchedulesService: { populateCourtSchedule: jest.Mock };
  let publicListingCache: { invalidateAfterMutation: jest.Mock };

  beforeEach(async () => {
    sportRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, name: 'Futsal', needsNet: false },
      ]),
      create: jest.fn((data) => data),
      save: jest.fn(async (rows) => rows),
    };
    osRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((data) => data),
      save: jest.fn(async (rows) => rows),
    };
    courtRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({
        ...data,
        id: 9,
        public_id: 'new-court',
      })),
      manager: {
        getRepository: jest.fn((entity) => {
          if (entity === Sport) return sportRepo;
          if (entity === OperatingSchedule) return osRepo;
          return {};
        }),
      },
    };
    companyRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        public_id: 'company-1',
        slug: 'arena',
        administrator: { public_id: 'owner-1' },
      }),
    };
    courtSchedulesService = {
      populateCourtSchedule: jest.fn().mockResolvedValue(undefined),
    };
    publicListingCache = { invalidateAfterMutation: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtsService,
        { provide: getRepositoryToken(Court), useValue: courtRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: PublicListingCache, useValue: publicListingCache },
        { provide: CourtSchedulesService, useValue: courtSchedulesService },
      ],
    }).compile();

    service = module.get(CourtsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOwned', () => {
    const dto = {
      name: 'Q2',
      sports: [{ name: 'Futsal' }],
      floor: 'madeira',
      price: 120,
    };

    it('recusa quando não há grade para copiar', async () => {
      await expect(
        service.createOwned('company-1', 'owner-1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('copia OS, oculta no site e popula o dia 0', async () => {
      courtRepo.find.mockResolvedValue([{ id: 2, public_id: 'q1' }]);
      osRepo.count.mockResolvedValue(2);
      osRepo.find.mockResolvedValue([
        {
          court_id: 2,
          day_of_week_id: 2,
          hour: '08:00:00',
          price: 80,
          is_active: true,
          is_public: true,
        },
      ]);

      const result = await service.createOwned('company-1', 'owner-1', dto);

      expect(result.publicId).toBe('new-court');
      expect(result.schedulesReady).toBe(true);
      expect(courtRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ show: false, name: 'Q2' }),
      );
      expect(osRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          court_id: 9,
          hour: '08:00:00',
          price: 120,
          is_fixed: false,
        }),
      ]);
      expect(courtSchedulesService.populateCourtSchedule).toHaveBeenCalled();
    });
  });
});
