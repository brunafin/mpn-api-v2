import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourtSchedulesService } from './court-schedules.service';
import { CourtSchedule } from './entities/court-schedule.entity';
import { OperatingSchedule } from '../operating-schedule/entities/operating-schedule.entity';
import { Court } from '../courts/entities/court.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Company } from '../companies/entities/company.entity';
import { PublicListingCache } from '../cache/public-listing.cache';

type MockFn = jest.Mock;

type MockRepo = {
  find: MockFn;
  findOne: MockFn;
  create: MockFn;
  save: MockFn;
  update: MockFn;
  delete: MockFn;
  insert: MockFn;
  createQueryBuilder?: MockFn;
  manager?: {
    transaction: MockFn;
  };
};

const OWNER_ID = 'owner-public-id';
const SCHEDULE_PUBLIC_ID = 'sched-uuid-1';
const COMPANY_PUBLIC_ID = 'company-uuid-1';

const makeRepo = (): MockRepo => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((entity) => entity),
  save: jest.fn((entity) => Promise.resolve(entity)),
  update: jest.fn(),
  delete: jest.fn(),
  insert: jest.fn(),
  createQueryBuilder: jest.fn(),
});

function ownedCourt(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    company: {
      id: 10,
      company_id: 10,
      administrator: { public_id: OWNER_ID },
    },
    ...overrides,
  };
}

function ownedSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    public_id: SCHEDULE_PUBLIC_ID,
    court: {
      id: 2,
      company_id: 10,
      company: {
        id: 10,
        administrator: { public_id: OWNER_ID },
      },
    },
    ...overrides,
  };
}

describe('CourtSchedulesService', () => {
  let service: CourtSchedulesService;
  let courtSchedulesRepo: MockRepo;
  let companyRepo: MockRepo;
  let operatingScheduleRepo: MockRepo;
  let courtRepo: MockRepo;
  let publicListingCache: {
    getOrSet: jest.Mock;
    clear: jest.Mock;
    invalidateAfterMutation: jest.Mock;
  };

  let txCourtSchedule: MockRepo;
  let txOperatingSchedule: MockRepo;
  let txReservation: MockRepo;
  let queryBuilder: {
    update: jest.Mock;
    set: jest.Mock;
    whereInIds: jest.Mock;
    delete: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  let manager: {
    getRepository: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    courtSchedulesRepo = makeRepo();
    companyRepo = makeRepo();
    operatingScheduleRepo = makeRepo();
    courtRepo = makeRepo();
    publicListingCache = {
      getOrSet: jest.fn((_k, factory) => factory()),
      clear: jest.fn(),
      invalidateAfterMutation: jest.fn(),
    };

    txCourtSchedule = makeRepo();
    txOperatingSchedule = makeRepo();
    txReservation = makeRepo();

    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === CourtSchedule) return txCourtSchedule;
        if (entity === OperatingSchedule) return txOperatingSchedule;
        if (entity === Reservation) return txReservation;
        throw new Error(`Unexpected repository: ${entity?.name ?? entity}`);
      }),
      createQueryBuilder: jest.fn(() => queryBuilder),
    };

    courtSchedulesRepo.manager = {
      transaction: jest.fn(async (cb: (m: typeof manager) => unknown) =>
        cb(manager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourtSchedulesService,
        {
          provide: getRepositoryToken(CourtSchedule),
          useValue: courtSchedulesRepo,
        },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        {
          provide: getRepositoryToken(OperatingSchedule),
          useValue: operatingScheduleRepo,
        },
        { provide: getRepositoryToken(Court), useValue: courtRepo },
        { provide: getRepositoryToken(Reservation), useValue: makeRepo() },
        { provide: PublicListingCache, useValue: publicListingCache },
      ],
    }).compile();

    service = module.get<CourtSchedulesService>(CourtSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('quickCreate', () => {
    const baseBody = { start_hour: '10:00', date: '2025-08-20', court_id: 2 };

    beforeEach(() => {
      courtRepo.findOne.mockResolvedValue(ownedCourt());
    });

    it('usa o preço do operating_schedule quando o body não informa preço', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue(null);
      operatingScheduleRepo.findOne.mockResolvedValue({ price: 80 });

      const created = await service.quickCreate(baseBody, OWNER_ID);

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

      const created = await service.quickCreate(
        { ...baseBody, price: 50 },
        OWNER_ID,
      );

      expect(created).toMatchObject({ price: 50 });
    });

    it('usa 0 quando não há preço no body nem operating_schedule', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue(null);
      operatingScheduleRepo.findOne.mockResolvedValue(null);

      const created = await service.quickCreate(baseBody, OWNER_ID);

      expect(created).toMatchObject({ price: 0 });
    });

    it('lança erro quando o horário já existe', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(service.quickCreate(baseBody, OWNER_ID)).rejects.toThrow(
        'O horário já existe',
      );
    });
  });

  describe('fixSchedule', () => {
    const body = { court_schedule_public_id: SCHEDULE_PUBLIC_ID };

    const baseSchedule = {
      id: 1,
      public_id: SCHEDULE_PUBLIC_ID,
      court_id: 2,
      day_of_week_id: 3,
      start_hour: '10:00:00',
      date: new Date('2025-08-20'),
      court: { id: 2, company_id: 10 },
      reservation: {
        id: 50,
        contact_name: 'João',
        contact_phone: '51999999999',
        sport_id: 7,
      },
    };

    const operating = {
      court_id: 2,
      day_of_week_id: 3,
      hour: '10:00:00',
    };

    beforeEach(() => {
      courtSchedulesRepo.findOne.mockResolvedValue(ownedSchedule());
      txCourtSchedule.findOne.mockResolvedValue(baseSchedule);
      txOperatingSchedule.findOne.mockResolvedValue(operating);
      txCourtSchedule.find.mockResolvedValue([]);
    });

    it('fixa o horário atual, operating_schedule e limpa cache público', async () => {
      const result = await service.fixSchedule(body, OWNER_ID);

      expect(result).toEqual({ message: 'Horário fixado com sucesso' });
      expect(txCourtSchedule.update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({
          is_fixed: true,
          available: false,
          fixed_contact_name: 'João',
          fixed_contact_phone: '51999999999',
          sport_id: 7,
        }),
      );
      expect(txOperatingSchedule.update).toHaveBeenCalledWith(
        {
          court_id: 2,
          day_of_week_id: 3,
          hour: '10:00:00',
        },
        expect.objectContaining({
          is_fixed: true,
          fixed_contact_name: 'João',
          fixed_contact_phone: '51999999999',
          sport_id: 7,
        }),
      );
      expect(publicListingCache.invalidateAfterMutation).toHaveBeenCalled();
    });

    it('grava fixed_contact_phone null quando a reserva não tem telefone', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        ...baseSchedule,
        reservation: {
          ...baseSchedule.reservation,
          contact_phone: '',
        },
      });

      await service.fixSchedule(body, OWNER_ID);

      expect(txCourtSchedule.update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({
          fixed_contact_name: 'João',
          fixed_contact_phone: null,
        }),
      );
    });

    it('atualiza futuros em lote e insere reservas faltantes de uma vez', async () => {
      const futureWithoutReservation = {
        id: 11,
        date: new Date('2025-08-27'),
        reservation: null,
      };
      const futureWithSameContact = {
        id: 12,
        date: new Date('2025-09-03'),
        reservation: {
          id: 60,
          contact_name: 'João',
          contact_phone: '51999999999',
        },
      };
      txCourtSchedule.find.mockResolvedValue([
        futureWithoutReservation,
        futureWithSameContact,
      ]);

      await service.fixSchedule(body, OWNER_ID);

      expect(manager.createQueryBuilder).toHaveBeenCalled();
      expect(queryBuilder.update).toHaveBeenCalledWith(CourtSchedule);
      expect(queryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          is_fixed: true,
          available: false,
          fixed_contact_name: 'João',
          fixed_contact_phone: '51999999999',
          sport_id: 7,
        }),
      );
      expect(queryBuilder.whereInIds).toHaveBeenCalledWith([11, 12]);
      expect(queryBuilder.execute).toHaveBeenCalledTimes(1);

      expect(txReservation.insert).toHaveBeenCalledWith([
        {
          court_schedule_id: 11,
          contact_name: 'João',
          contact_phone: '51999999999',
          sport_id: 7,
        },
      ]);
      // Não deve salvar futuro por futuro (regressão do N+1)
      expect(txCourtSchedule.save).not.toHaveBeenCalled();
      expect(txReservation.save).not.toHaveBeenCalled();
    });

    it('bloqueia fixar quando já há reserva futura de outro contato', async () => {
      txCourtSchedule.find.mockResolvedValue([
        {
          id: 11,
          date: new Date('2025-08-27'),
          reservation: {
            id: 60,
            contact_name: 'Maria',
            contact_phone: '51888888888',
          },
        },
      ]);

      await expect(service.fixSchedule(body, OWNER_ID)).rejects.toThrow(
        /Não é possível fixar.*Maria/,
      );
      expect(queryBuilder.execute).not.toHaveBeenCalled();
      expect(txReservation.insert).not.toHaveBeenCalled();
    });

    it('exige reserva no horário a fixar', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        ...baseSchedule,
        reservation: null,
      });

      await expect(service.fixSchedule(body, OWNER_ID)).rejects.toThrow(
        'Horário não possui reserva',
      );
    });

    it('exige operating_schedule correspondente', async () => {
      txOperatingSchedule.findOne.mockResolvedValue(null);

      await expect(service.fixSchedule(body, OWNER_ID)).rejects.toThrow(
        'Horário de funcionamento não encontrado',
      );
    });

    it('rejeita owner que não é administrador da arena', async () => {
      courtSchedulesRepo.findOne.mockResolvedValue(
        ownedSchedule({
          court: {
            id: 2,
            company: { administrator: { public_id: 'outro-owner' } },
          },
        }),
      );

      await expect(service.fixSchedule(body, OWNER_ID)).rejects.toThrow(
        'Você não tem acesso a este estabelecimento.',
      );
      expect(courtSchedulesRepo.manager!.transaction).not.toHaveBeenCalled();
    });
  });

  describe('unfixSchedule', () => {
    const body = { court_schedule_public_id: SCHEDULE_PUBLIC_ID };

    beforeEach(() => {
      courtSchedulesRepo.findOne.mockResolvedValue(ownedSchedule());
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '10:00:00',
        date: new Date('2025-08-20'),
      });
      txOperatingSchedule.findOne.mockResolvedValue({
        court_id: 2,
        day_of_week_id: 3,
        hour: '10:00:00',
      });
      txCourtSchedule.find.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    });

    it('libera o horário atual e futuros em lote (sem N+1)', async () => {
      const result = await service.unfixSchedule(body, OWNER_ID);

      expect(result).toEqual({ message: 'Horário desafixado com sucesso' });
      expect(txCourtSchedule.update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({
          is_fixed: false,
          available: true,
          fixed_contact_name: null,
          fixed_contact_phone: null,
          sport_id: null,
        }),
      );
      expect(txOperatingSchedule.update).toHaveBeenCalledWith(
        {
          court_id: 2,
          day_of_week_id: 3,
          hour: '10:00:00',
        },
        expect.objectContaining({
          is_fixed: false,
          fixed_contact_name: null,
          fixed_contact_phone: null,
          sport_id: null,
        }),
      );
      expect(txReservation.delete).toHaveBeenCalledWith({
        court_schedule_id: 1,
      });

      expect(queryBuilder.update).toHaveBeenCalledWith(CourtSchedule);
      expect(queryBuilder.whereInIds).toHaveBeenCalledWith([11, 12]);
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.from).toHaveBeenCalledWith(Reservation);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'court_schedule_id IN (:...ids)',
        { ids: [11, 12] },
      );
      expect(queryBuilder.execute).toHaveBeenCalledTimes(2);
      expect(txCourtSchedule.save).not.toHaveBeenCalled();
      expect(publicListingCache.invalidateAfterMutation).toHaveBeenCalled();
    });

    it('não faz update em lote quando não há futuros', async () => {
      txCourtSchedule.find.mockResolvedValue([]);

      await service.unfixSchedule(body, OWNER_ID);

      expect(queryBuilder.execute).not.toHaveBeenCalled();
      expect(txCourtSchedule.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateDayAvailability', () => {
    const body = {
      company_public_id: COMPANY_PUBLIC_ID,
      date: '2026-07-26',
      available: false,
    };

    let dayQueryBuilder: {
      innerJoin: MockFn;
      leftJoinAndSelect: MockFn;
      where: MockFn;
      andWhere: MockFn;
      getMany: MockFn;
    };

    beforeEach(() => {
      companyRepo.findOne.mockResolvedValue({
        id: 10,
        public_id: COMPANY_PUBLIC_ID,
        administrator: { public_id: OWNER_ID },
      });

      dayQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      courtSchedulesRepo.createQueryBuilder!.mockReturnValue(dayQueryBuilder);
      courtSchedulesRepo.update.mockResolvedValue({ affected: 1 });
    });

    it('fecha só horários disponíveis (ignora reserva e fixo)', async () => {
      dayQueryBuilder.getMany.mockResolvedValue([
        { id: 1, available: true, is_fixed: false, reservation: null, closed_by_day: false },
        { id: 2, available: true, is_fixed: false, reservation: { id: 9 }, closed_by_day: false },
        { id: 3, available: true, is_fixed: true, reservation: null, closed_by_day: false },
        { id: 4, available: false, is_fixed: false, reservation: null, closed_by_day: false },
      ]);

      const result = await service.updateDayAvailability(body, OWNER_ID);

      expect(result).toEqual({
        updated: 1,
        date: '2026-07-26',
        available: false,
        isDayClosed: true,
      });
      expect(courtSchedulesRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { available: false, closed_by_day: true },
      );
      expect(publicListingCache.invalidateAfterMutation).toHaveBeenCalled();
    });

    it('reabre só horários marcados closed_by_day', async () => {
      dayQueryBuilder.getMany.mockResolvedValue([
        { id: 1, available: false, is_fixed: false, reservation: null, closed_by_day: true },
        { id: 2, available: true, is_fixed: false, reservation: null, closed_by_day: false },
        { id: 3, available: false, is_fixed: false, reservation: null, closed_by_day: false },
      ]);

      const result = await service.updateDayAvailability(
        { ...body, available: true },
        OWNER_ID,
      );

      expect(result.updated).toBe(1);
      expect(result.isDayClosed).toBe(false);
      expect(courtSchedulesRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { available: true, closed_by_day: false },
      );
    });

    it('não chama update quando não há alvos', async () => {
      dayQueryBuilder.getMany.mockResolvedValue([
        { id: 1, available: false, is_fixed: false, reservation: null, closed_by_day: false },
      ]);

      const result = await service.updateDayAvailability(body, OWNER_ID);

      expect(result.updated).toBe(0);
      expect(result.isDayClosed).toBe(false);
      expect(courtSchedulesRepo.update).not.toHaveBeenCalled();
      expect(publicListingCache.invalidateAfterMutation).not.toHaveBeenCalled();
    });
  });

  describe('populateCourtSchedule', () => {
    it('copia fixed_contact_* do template e cria reserva fixa', async () => {
      // 2025-08-20 = quarta (ref 3)
      txOperatingSchedule.find.mockResolvedValue([
        {
          hour: '10:00:00',
          price: 90,
          day_of_week: { ref: 3 },
          day_of_week_id: 3,
          is_fixed: true,
          fixed_contact_name: 'Ana',
          fixed_contact_phone: '51988887777',
          sport_id: 7,
          is_active: true,
        },
      ]);
      txCourtSchedule.find
        .mockResolvedValueOnce([]) // existentes no intervalo
        .mockResolvedValueOnce([
          {
            id: 55,
            is_fixed: true,
            fixed_contact_name: 'Ana',
            fixed_contact_phone: '51988887777',
            sport_id: 7,
          },
        ]);
      txCourtSchedule.save.mockResolvedValue([{ id: 55 }]);

      await service.populateCourtSchedule(2, '2025-08-20', '2025-08-20');

      expect(txCourtSchedule.save).toHaveBeenCalledWith([
        expect.objectContaining({
          is_fixed: true,
          fixed_contact_name: 'Ana',
          fixed_contact_phone: '51988887777',
          sport_id: 7,
          available: false,
        }),
      ]);
      expect(txReservation.save).toHaveBeenCalledWith([
        expect.objectContaining({
          contact_name: 'Ana',
          contact_phone: '51988887777',
          sport_id: 7,
        }),
      ]);
    });

    it('não cria reserva fixa sem fixed_contact_name', async () => {
      txOperatingSchedule.find.mockResolvedValue([
        {
          hour: '10:00:00',
          price: 90,
          day_of_week: { ref: 3 },
          day_of_week_id: 3,
          is_fixed: true,
          fixed_contact_name: null,
          fixed_contact_phone: null,
          sport_id: 7,
          is_active: true,
        },
      ]);
      txCourtSchedule.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 55,
            is_fixed: true,
            fixed_contact_name: null,
            sport_id: 7,
          },
        ]);
      txCourtSchedule.save.mockResolvedValue([{ id: 55 }]);

      await service.populateCourtSchedule(2, '2025-08-20', '2025-08-20');

      expect(txReservation.save).not.toHaveBeenCalled();
    });
  });
});
