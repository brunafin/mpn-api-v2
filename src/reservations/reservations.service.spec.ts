import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReservationsService } from './reservations.service';
import { Reservation } from './entities/reservation.entity';
import { CourtSchedule } from '../court-schedules/entities/court-schedule.entity';
import { OperatingSchedule } from '../operating-schedule/entities/operating-schedule.entity';
import { PublicListingCache } from '../cache/public-listing.cache';

const OWNER_ID = 'owner-public-id';
const RESERVATION_PUBLIC_ID = 'res-uuid-1';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationsRepo: {
    findOne: jest.Mock;
  };
  let operatingScheduleRepo: {
    findOne: jest.Mock;
  };
  let publicListingCache: {
    invalidateAfterMutation: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      findOne: jest.Mock;
      remove: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    reservationsRepo = { findOne: jest.fn() };
    operatingScheduleRepo = { findOne: jest.fn() };
    publicListingCache = { invalidateAfterMutation: jest.fn() };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        remove: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepo,
        },
        {
          provide: getRepositoryToken(CourtSchedule),
          useValue: { findOne: jest.fn(), update: jest.fn() },
        },
        {
          provide: getRepositoryToken(OperatingSchedule),
          useValue: operatingScheduleRepo,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: () => queryRunner,
          },
        },
        { provide: PublicListingCache, useValue: publicListingCache },
      ],
    }).compile();

    service = module.get(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cancelByPublicId', () => {
    const owned = {
      id: 9,
      public_id: RESERVATION_PUBLIC_ID,
      court_schedule: {
        id: 1,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '10:00:00',
        date: '2030-07-26',
        is_fixed: false,
        court: {
          company: {
            public_id: 'company-1',
            slug: 'arena',
            administrator: { public_id: OWNER_ID },
          },
        },
      },
    };

    beforeEach(() => {
      owned.court_schedule.is_fixed = false;
      reservationsRepo.findOne.mockResolvedValue(owned);
      queryRunner.manager.findOne.mockResolvedValue({
        id: 9,
        court_schedule_id: 1,
      });
    });

    it('cancela fixo interno deixando o horário inativo', async () => {
      owned.court_schedule.is_fixed = true;
      operatingScheduleRepo.findOne.mockResolvedValue({ is_public: false });

      const result = await service.cancelByPublicId(
        RESERVATION_PUBLIC_ID,
        OWNER_ID,
      );

      expect(result).toEqual({ message: 'Reserva cancelada com sucesso!' });
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        CourtSchedule,
        1,
        expect.objectContaining({
          available: false,
          is_fixed: false,
        }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('cancela fixo comercial sem reabrir o horário no portal', async () => {
      owned.court_schedule.is_fixed = true;
      operatingScheduleRepo.findOne.mockResolvedValue({ is_public: true });

      await service.cancelByPublicId(RESERVATION_PUBLIC_ID, OWNER_ID);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        CourtSchedule,
        1,
        expect.objectContaining({
          available: false,
          is_fixed: false,
        }),
      );
    });

    it('cancela órfão (sem OS) reabrindo o horário', async () => {
      operatingScheduleRepo.findOne.mockResolvedValue(null);

      await service.cancelByPublicId(RESERVATION_PUBLIC_ID, OWNER_ID);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        CourtSchedule,
        1,
        expect.objectContaining({
          available: true,
        }),
      );
    });
  });

  describe('create', () => {
    it('rejeita horário que já passou', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 1,
          public_id: 'cs-1',
          available: true,
          is_fixed: false,
          date: '2020-01-01',
          start_hour: '10:00:00',
          court: {
            company: {
              public_id: 'company-1',
              slug: 'arena',
              administrator: { public_id: OWNER_ID },
            },
          },
        }),
      };
      (queryRunner.manager as unknown as { getRepository: jest.Mock }).getRepository =
        jest.fn().mockReturnValue({
          createQueryBuilder: () => qb,
        });

      await expect(
        service.create(
          {
            courtSchedulePublicId: 'cs-1',
            contactName: 'Cliente',
          } as never,
          OWNER_ID,
        ),
      ).rejects.toThrow(/já passou/i);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('rejeita horário fixo mesmo se available estiver true', async () => {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 1,
          public_id: 'cs-1',
          available: true,
          is_fixed: true,
          date: '2030-07-26',
          start_hour: '10:00:00',
          court: {
            company: {
              public_id: 'company-1',
              slug: 'arena',
              administrator: { public_id: OWNER_ID },
            },
          },
        }),
      };
      (queryRunner.manager as unknown as { getRepository: jest.Mock }).getRepository =
        jest.fn().mockReturnValue({
          createQueryBuilder: () => qb,
        });

      await expect(
        service.create(
          {
            courtSchedulePublicId: 'cs-1',
            contactName: 'Cliente',
          } as never,
          OWNER_ID,
        ),
      ).rejects.toThrow(/indisponível/i);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
