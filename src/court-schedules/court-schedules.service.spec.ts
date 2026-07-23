import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourtSchedulesService } from './court-schedules.service';
import { CourtSchedule } from './entities/court-schedule.entity';
import { OperatingSchedule } from '../operating-schedule/entities/operating-schedule.entity';
import { Court } from '../courts/entities/court.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Company } from '../companies/entities/company.entity';
import { PublicListingCache } from '../cache/public-listing.cache';

type MockRepo = { [method: string]: jest.Mock };

const makeRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((entity) => entity),
  save: jest.fn((entity) => Promise.resolve(entity)),
});

describe('CourtSchedulesService', () => {
  let service: CourtSchedulesService;
  let courtSchedulesRepo: MockRepo;
  let operatingScheduleRepo: MockRepo;

  beforeEach(async () => {
    courtSchedulesRepo = makeRepo();
    operatingScheduleRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtSchedulesService,
        {
          provide: getRepositoryToken(CourtSchedule),
          useValue: courtSchedulesRepo,
        },
        { provide: getRepositoryToken(Company), useValue: makeRepo() },
        {
          provide: getRepositoryToken(OperatingSchedule),
          useValue: operatingScheduleRepo,
        },
        { provide: getRepositoryToken(Court), useValue: makeRepo() },
        { provide: getRepositoryToken(Reservation), useValue: makeRepo() },
        {
          provide: PublicListingCache,
          useValue: {
            getOrSet: jest.fn((_k, factory) => factory()),
            clear: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CourtSchedulesService>(CourtSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('quickCreate', () => {
    const baseBody = { start_hour: '10:00', date: '2025-08-20', court_id: 2 };

    it('usa o preço do operating_schedule quando o body não informa preço', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue(null);
      operatingScheduleRepo.findOne.mockResolvedValue({ price: 80 });

      const created = await service.quickCreate(baseBody);

      expect(created).toMatchObject({
        price: 80,
        court_id: 2,
        start_hour: '10:00',
      });
      expect(courtSchedulesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ price: 80 }),
      );
    });

    it('prioriza o preço enviado no body sobre o do operating_schedule', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue(null);
      operatingScheduleRepo.findOne.mockResolvedValue({ price: 80 });

      const created = await service.quickCreate({ ...baseBody, price: 50 });

      expect(created).toMatchObject({ price: 50 });
    });

    it('usa 0 quando não há preço no body nem operating_schedule', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue(null);
      operatingScheduleRepo.findOne.mockResolvedValue(null);

      const created = await service.quickCreate(baseBody);

      expect(created).toMatchObject({ price: 0 });
    });

    it('lança erro quando o horário já existe', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(service.quickCreate(baseBody)).rejects.toThrow(
        'O horário já existe',
      );
    });
  });
});
