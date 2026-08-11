import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CourtSchedulesService } from './court-schedules.service';
import { CourtSchedule } from './entities/court-schedule.entity';
import { OperatingSchedule } from '../operating-schedule/entities/operating-schedule.entity';
import { Court } from '../courts/entities/court.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Company } from '../companies/entities/company.entity';
import { Plan } from '../plans/entities/plan.entity';
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
    andWhere: jest.Mock;
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
      andWhere: jest.fn().mockReturnThis(),
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
        { provide: getRepositoryToken(Plan), useValue: makeRepo() },
        { provide: PublicListingCache, useValue: publicListingCache },
      ],
    }).compile();

    service = module.get<CourtSchedulesService>(CourtSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('quickCreate', () => {
    const baseBody = { start_hour: '10:00', date: '2099-08-20', court_id: 2 };

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
      expect(operatingScheduleRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            court_id: 2,
            hour: '10:00',
            day_of_week_id: 5,
          }),
        }),
      );
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

    it('cria operating_schedule interno quando o slot está fora da grade', async () => {
      txOperatingSchedule.findOne.mockResolvedValue(null);
      txCourtSchedule.findOne.mockResolvedValue({
        ...baseSchedule,
        price: 90,
      });
      const populateSpy = jest
        .spyOn(service, 'populateCourtSchedule')
        .mockResolvedValue([]);

      const result = await service.fixSchedule(body, OWNER_ID);

      expect(result).toEqual({ message: 'Horário fixado com sucesso' });
      expect(txOperatingSchedule.save).toHaveBeenCalledWith(
        expect.objectContaining({
          court_id: 2,
          day_of_week_id: 3,
          hour: '10:00:00',
          price: 90,
          is_active: true,
          is_fixed: true,
          is_public: false,
          fixed_contact_name: 'João',
          fixed_contact_phone: '51999999999',
          sport_id: 7,
        }),
      );
      expect(txOperatingSchedule.update).not.toHaveBeenCalled();
      expect(populateSpy).toHaveBeenCalledWith(
        2,
        expect.any(String),
        expect.any(String),
        undefined,
        expect.anything(),
      );
      populateSpy.mockRestore();
    });

    it('reverte o fix interno se o populate da série falhar', async () => {
      txOperatingSchedule.findOne.mockResolvedValue(null);
      txCourtSchedule.findOne.mockResolvedValue({
        ...baseSchedule,
        price: 90,
      });
      const populateSpy = jest
        .spyOn(service, 'populateCourtSchedule')
        .mockRejectedValue(new Error('grade indisponível'));

      await expect(service.fixSchedule(body, OWNER_ID)).rejects.toThrow(
        /Não foi possível gerar as próximas semanas/,
      );
      populateSpy.mockRestore();
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
        is_public: true,
      });
      txCourtSchedule.find.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    });

    it('libera o horário atual e futuros em lote (sem N+1)', async () => {
      const result = await service.unfixSchedule(body, OWNER_ID);

      expect(result).toEqual({
        message: 'Horário desafixado com sucesso',
        removed: false,
      });
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

      expect(txCourtSchedule.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            is_fixed: true,
          }),
        }),
      );
      expect(queryBuilder.update).toHaveBeenCalledWith(CourtSchedule);
      expect(queryBuilder.whereInIds).toHaveBeenCalledWith([11, 12]);
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.from).toHaveBeenCalledWith(Reservation);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'court_schedule_id IN (:...ids)',
        { ids: [11, 12] },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('date < :date', {
        date: expect.any(Date),
      });
      expect(queryBuilder.execute).toHaveBeenCalledTimes(3);
      expect(txCourtSchedule.save).not.toHaveBeenCalled();
      expect(txOperatingSchedule.delete).not.toHaveBeenCalled();
      expect(publicListingCache.invalidateAfterMutation).toHaveBeenCalled();
    });

    it('desafixa horário interno removendo a série inteira e o OS', async () => {
      txOperatingSchedule.findOne.mockResolvedValue({
        court_id: 2,
        day_of_week_id: 3,
        hour: '10:00:00',
        is_public: false,
      });
      txCourtSchedule.find.mockResolvedValue([{ id: 1 }, { id: 11 }, { id: 12 }]);

      const result = await service.unfixSchedule(body, OWNER_ID);

      expect(result).toEqual({
        message: 'Horário desafixado com sucesso',
        removed: true,
      });
      expect(txCourtSchedule.update).not.toHaveBeenCalled();
      expect(txOperatingSchedule.delete).toHaveBeenCalledWith({
        court_id: 2,
        day_of_week_id: 3,
        hour: '10:00:00',
      });
      expect(txOperatingSchedule.update).not.toHaveBeenCalled();
      expect(queryBuilder.from).toHaveBeenCalledWith(Reservation);
      expect(queryBuilder.from).toHaveBeenCalledWith(CourtSchedule);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'id IN (:...ids)',
        { ids: [1, 11, 12] },
      );
    });

    it('não faz update em lote de futuros quando não há futuros (comercial)', async () => {
      txCourtSchedule.find.mockResolvedValue([]);

      const result = await service.unfixSchedule(body, OWNER_ID);

      expect(result).toEqual({
        message: 'Horário desafixado com sucesso',
        removed: false,
      });
      // Só limpa is_fixed dos passados (sem whereInIds de futuros).
      expect(queryBuilder.whereInIds).not.toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('date < :date', {
        date: expect.any(Date),
      });
      expect(queryBuilder.execute).toHaveBeenCalledTimes(1);
      expect(txCourtSchedule.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeByPublicId', () => {
    beforeEach(() => {
      courtSchedulesRepo.findOne.mockResolvedValue(ownedSchedule());
    });

    it('exclui horário interno disponível e remove OS + futuros livres', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '02:00:00',
        available: true,
        is_fixed: false,
        reservation: null,
      });
      txOperatingSchedule.findOne.mockResolvedValue({
        court_id: 2,
        day_of_week_id: 3,
        hour: '02:00:00',
        is_public: false,
      });
      txCourtSchedule.find.mockResolvedValue([
        { id: 11, date: new Date('2025-08-27'), is_fixed: false, reservation: null },
      ]);

      const result = await service.removeByPublicId(
        SCHEDULE_PUBLIC_ID,
        OWNER_ID,
      );

      expect(result).toEqual({ message: 'Horário excluído com sucesso' });
      expect(txOperatingSchedule.delete).toHaveBeenCalledWith({
        court_id: 2,
        day_of_week_id: 3,
        hour: '02:00:00',
      });
      expect(txCourtSchedule.delete).toHaveBeenCalledWith({ id: 1 });
      expect(queryBuilder.from).toHaveBeenCalledWith(CourtSchedule);
      expect(publicListingCache.invalidateAfterMutation).toHaveBeenCalled();
    });

    it('exclui órfão disponível sem OS', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '02:00:00',
        available: true,
        is_fixed: false,
        reservation: null,
      });
      txOperatingSchedule.findOne.mockResolvedValue(null);

      await service.removeByPublicId(SCHEDULE_PUBLIC_ID, OWNER_ID);

      expect(txCourtSchedule.delete).toHaveBeenCalledWith({ id: 1 });
      expect(txOperatingSchedule.delete).not.toHaveBeenCalled();
    });

    it('rejeita grade comercial pública', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '18:00:00',
        available: true,
        is_fixed: false,
        reservation: null,
      });
      txOperatingSchedule.findOne.mockResolvedValue({
        court_id: 2,
        day_of_week_id: 3,
        hour: '18:00:00',
        is_public: true,
      });

      await expect(
        service.removeByPublicId(SCHEDULE_PUBLIC_ID, OWNER_ID),
      ).rejects.toThrow(/grade comercial/);
      expect(txCourtSchedule.delete).not.toHaveBeenCalled();
    });

    it('rejeita quando há reserva', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        available: true,
        is_fixed: false,
        reservation: { id: 9 },
      });

      await expect(
        service.removeByPublicId(SCHEDULE_PUBLIC_ID, OWNER_ID),
      ).rejects.toThrow(/reserva/);
    });

    it('exclui horário interno inativo', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '02:00:00',
        available: false,
        is_fixed: false,
        reservation: null,
      });
      txOperatingSchedule.findOne.mockResolvedValue({
        court_id: 2,
        day_of_week_id: 3,
        hour: '02:00:00',
        is_public: false,
      });
      txCourtSchedule.find.mockResolvedValue([]);

      const result = await service.removeByPublicId(
        SCHEDULE_PUBLIC_ID,
        OWNER_ID,
      );

      expect(result).toEqual({ message: 'Horário excluído com sucesso' });
      expect(txCourtSchedule.delete).toHaveBeenCalledWith({ id: 1 });
      expect(txOperatingSchedule.delete).toHaveBeenCalled();
    });

    it('rejeita com reserva ou fixo futuro na série interna', async () => {
      txCourtSchedule.findOne.mockResolvedValue({
        id: 1,
        public_id: SCHEDULE_PUBLIC_ID,
        court_id: 2,
        day_of_week_id: 3,
        start_hour: '02:00:00',
        available: true,
        is_fixed: false,
        reservation: null,
      });
      txOperatingSchedule.findOne.mockResolvedValue({
        court_id: 2,
        day_of_week_id: 3,
        hour: '02:00:00',
        is_public: false,
      });
      txCourtSchedule.find.mockResolvedValue([
        {
          id: 11,
          date: new Date('2025-08-27'),
          is_fixed: false,
          reservation: { id: 99 },
        },
      ]);

      await expect(
        service.removeByPublicId(SCHEDULE_PUBLIC_ID, OWNER_ID),
      ).rejects.toThrow(/reserva ou fixo/);
      expect(txCourtSchedule.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateAvailability', () => {
    beforeEach(() => {
      courtSchedulesRepo.findOne
        .mockResolvedValueOnce(ownedSchedule({ date: '2030-01-15' }))
        .mockResolvedValueOnce({
          id: 1,
          public_id: SCHEDULE_PUBLIC_ID,
          date: '2030-01-15',
          start_hour: '10:00:00',
          available: false,
          is_fixed: false,
          reservation: null,
        });
      courtSchedulesRepo.update.mockResolvedValue({ affected: 1 });
    });

    it('ativa horário livre futuro', async () => {
      const result = await service.updateAvailability(
        SCHEDULE_PUBLIC_ID,
        true,
        OWNER_ID,
      );

      expect(result).toEqual({ affected: 1 });
      expect(courtSchedulesRepo.update).toHaveBeenCalledWith(
        { public_id: SCHEDULE_PUBLIC_ID },
        { available: true },
      );
    });

    it('rejeita ativar horário reservado ou fixo', async () => {
      courtSchedulesRepo.findOne.mockReset();
      courtSchedulesRepo.findOne
        .mockResolvedValueOnce(ownedSchedule())
        .mockResolvedValueOnce({
          id: 1,
          public_id: SCHEDULE_PUBLIC_ID,
          date: '2030-01-15',
          start_hour: '10:00:00',
          is_fixed: true,
          reservation: null,
        });

      await expect(
        service.updateAvailability(SCHEDULE_PUBLIC_ID, true, OWNER_ID),
      ).rejects.toThrow(/reservado ou fixo/);
      expect(courtSchedulesRepo.update).not.toHaveBeenCalled();
    });

    it('rejeita ativar horário que já passou', async () => {
      courtSchedulesRepo.findOne.mockReset();
      courtSchedulesRepo.findOne
        .mockResolvedValueOnce(ownedSchedule({ date: '2020-01-15' }))
        .mockResolvedValueOnce({
          id: 1,
          public_id: SCHEDULE_PUBLIC_ID,
          date: '2020-01-15',
          start_hour: '10:00:00',
          available: false,
          is_fixed: false,
          reservation: null,
        });

      await expect(
        service.updateAvailability(SCHEDULE_PUBLIC_ID, true, OWNER_ID),
      ).rejects.toThrow(/já passou/);
      expect(courtSchedulesRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('updateDayAvailability', () => {
    const body = {
      company_public_id: COMPANY_PUBLIC_ID,
      date: '2030-07-26',
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
        {
          id: 1,
          available: true,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '10:00:00',
        },
        {
          id: 2,
          available: true,
          is_fixed: false,
          reservation: { id: 9 },
          date: '2030-07-26',
          start_hour: '11:00:00',
        },
        {
          id: 3,
          available: true,
          is_fixed: true,
          reservation: null,
          date: '2030-07-26',
          start_hour: '12:00:00',
        },
        {
          id: 4,
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '13:00:00',
        },
      ]);

      const result = await service.updateDayAvailability(body, OWNER_ID);

      expect(result).toEqual({
        updated: 1,
        date: '2030-07-26',
        available: false,
        isDayClosed: false,
      });
      expect(courtSchedulesRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { available: false },
      );
      expect(publicListingCache.invalidateAfterMutation).toHaveBeenCalled();
    });

    it('reativa todos os inativos futuros (pula passado)', async () => {
      dayQueryBuilder.getMany.mockResolvedValue([
        {
          id: 1,
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '10:00:00',
        },
        {
          id: 2,
          available: true,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '11:00:00',
        },
        {
          id: 3,
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '12:00:00',
        },
        {
          id: 4,
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2020-01-15',
          start_hour: '09:00:00',
        },
      ]);

      const result = await service.updateDayAvailability(
        { ...body, available: true },
        OWNER_ID,
      );

      expect(result.updated).toBe(2);
      expect(result.isDayClosed).toBe(false);
      expect(courtSchedulesRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { available: true },
      );
      const updateArg = courtSchedulesRepo.update.mock.calls[0][0];
      expect(updateArg.id.value).toEqual([1, 3]);
    });

    it('não chama update quando não há alvos', async () => {
      dayQueryBuilder.getMany.mockResolvedValue([
        { id: 1, available: false, is_fixed: false, reservation: null },
      ]);

      const result = await service.updateDayAvailability(body, OWNER_ID);

      expect(result.updated).toBe(0);
      expect(result.isDayClosed).toBe(false);
      expect(courtSchedulesRepo.update).not.toHaveBeenCalled();
      expect(publicListingCache.invalidateAfterMutation).not.toHaveBeenCalled();
    });
  });

  describe('updateAvailabilityBatch', () => {
    let batchQueryBuilder: {
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
        slug: 'arena',
        administrator: { public_id: OWNER_ID },
      });
      batchQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      courtSchedulesRepo.createQueryBuilder!.mockReturnValue(batchQueryBuilder);
      courtSchedulesRepo.update.mockResolvedValue({ affected: 2 });
    });

    it('ativa só inativos selecionados', async () => {
      batchQueryBuilder.getMany.mockResolvedValue([
        {
          id: 1,
          public_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '10:00:00',
        },
        {
          id: 2,
          public_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '11:00:00',
        },
        {
          id: 3,
          public_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          available: true,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '12:00:00',
        },
      ]);

      const result = await service.updateAvailabilityBatch(
        {
          company_public_id: COMPANY_PUBLIC_ID,
          date: '2030-07-26',
          public_ids: [
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            'cccccccc-cccc-cccc-cccc-cccccccccccc',
          ],
          available: true,
        },
        OWNER_ID,
      );

      expect(result).toEqual({
        updated: 2,
        skipped: 1,
        date: '2030-07-26',
        available: true,
      });
      expect(courtSchedulesRepo.update.mock.calls[0][0].id.value).toEqual([
        1, 2,
      ]);
      expect(courtSchedulesRepo.update.mock.calls[0][1]).toEqual({
        available: true,
      });
    });

    it('não ativa horários que já passaram', async () => {
      batchQueryBuilder.getMany.mockResolvedValue([
        {
          id: 1,
          public_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2020-01-15',
          start_hour: '10:00:00',
        },
        {
          id: 2,
          public_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          available: false,
          is_fixed: false,
          reservation: null,
          date: '2030-07-26',
          start_hour: '11:00:00',
        },
      ]);

      const result = await service.updateAvailabilityBatch(
        {
          company_public_id: COMPANY_PUBLIC_ID,
          public_ids: [
            'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          ],
          available: true,
        },
        OWNER_ID,
      );

      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(courtSchedulesRepo.update.mock.calls[0][0].id.value).toEqual([2]);
    });

    it('rejeita public_ids fora da arena', async () => {
      batchQueryBuilder.getMany.mockResolvedValue([
        {
          id: 1,
          public_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          available: false,
          is_fixed: false,
          reservation: null,
        },
      ]);

      await expect(
        service.updateAvailabilityBatch(
          {
            company_public_id: COMPANY_PUBLIC_ID,
            public_ids: [
              'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            ],
            available: true,
          },
          OWNER_ID,
        ),
      ).rejects.toThrow(/não foram encontrados/);
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

    it('marca available=false ao popular OS interno não fixo', async () => {
      txOperatingSchedule.find.mockResolvedValue([
        {
          hour: '02:00:00',
          price: 50,
          day_of_week: { ref: 3 },
          day_of_week_id: 3,
          is_fixed: false,
          fixed_contact_name: null,
          fixed_contact_phone: null,
          sport_id: null,
          is_active: true,
          is_public: false,
        },
      ]);
      txCourtSchedule.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      txCourtSchedule.save.mockResolvedValue([{ id: 99 }]);

      await service.populateCourtSchedule(2, '2025-08-20', '2025-08-20');

      expect(txCourtSchedule.save).toHaveBeenCalledWith([
        expect.objectContaining({
          start_hour: '02:00',
          available: false,
          is_fixed: false,
        }),
      ]);
    });
  });

  describe('excludeInternalOperatingHours (portal)', () => {
    it('remove slots com OS is_public=false da listagem pública', async () => {
      courtSchedulesRepo.find.mockResolvedValue([
        {
          date: new Date('2099-01-01'),
          start_hour: '10:00:00',
          price: 90,
          court_id: 2,
          day_of_week_id: 3,
          court: {
            id: 2,
            name: 'Quadra 1',
            court_sports: [{ id: 1, name: 'Society' }],
          },
          day_of_week: { description: 'Quarta' },
        },
        {
          date: new Date('2099-01-01'),
          start_hour: '02:00:00',
          price: 50,
          court_id: 2,
          day_of_week_id: 3,
          court: {
            id: 2,
            name: 'Quadra 1',
            court_sports: [{ id: 1, name: 'Society' }],
          },
          day_of_week: { description: 'Quarta' },
        },
      ]);
      operatingScheduleRepo.find.mockResolvedValue([
        {
          court_id: 2,
          day_of_week_id: 3,
          hour: '02:00:00',
          is_public: false,
        },
      ]);

      const result = await service.findAvailableHoursByCourt({
        slug: 'poliplay',
        date: new Date('2099-01-01'),
      });

      expect(result).toHaveLength(1);
      expect(result[0].schedules).toHaveLength(1);
      expect(result[0].schedules[0].startHour).toBe('10:00');
    });
  });

  describe('checkPublicSlotAvailable', () => {
    const openSlot = {
      id: 9,
      date: '2099-01-01',
      start_hour: '19:00:00',
      court_id: 2,
      day_of_week_id: 3,
      court: { id: 2, name: 'Quadra 1' },
    };

    it('retorna available true quando o slot público ainda está livre', async () => {
      courtSchedulesRepo.find.mockResolvedValue([openSlot]);
      operatingScheduleRepo.find.mockResolvedValue([]);

      await expect(
        service.checkPublicSlotAvailable({
          slug: 'poliplay',
          date: '2099-01-01',
          startHour: '19:00',
          courtName: 'Quadra 1',
        }),
      ).resolves.toEqual({ available: true });
      expect(publicListingCache.getOrSet).not.toHaveBeenCalled();
    });

    it('retorna available false quando não há match', async () => {
      courtSchedulesRepo.find.mockResolvedValue([]);

      await expect(
        service.checkPublicSlotAvailable({
          slug: 'poliplay',
          date: '2099-01-01',
          startHour: '19:00',
          courtName: 'Quadra 1',
        }),
      ).resolves.toEqual({ available: false });
    });

    it('retorna available false para horário interno', async () => {
      courtSchedulesRepo.find.mockResolvedValue([openSlot]);
      operatingScheduleRepo.find.mockResolvedValue([
        {
          court_id: 2,
          day_of_week_id: 3,
          hour: '19:00:00',
          is_public: false,
        },
      ]);

      await expect(
        service.checkPublicSlotAvailable({
          slug: 'poliplay',
          date: '2099-01-01',
          startHour: '19:00',
          courtName: 'Quadra 1',
        }),
      ).resolves.toEqual({ available: false });
    });
  });
});
