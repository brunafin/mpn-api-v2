import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { Company } from '../companies/entities/company.entity';
import { Court } from '../courts/entities/court.entity';
import { OperatingSchedule } from '../operating-schedule/entities/operating-schedule.entity';
import { DaysOfWeek } from '../days-of-week/entities/days-of-week.entity';
import { Sport } from '../sports/entities/sport.entity';
import { Person } from '../people/entities/person.entity';
import { CourtSchedulesService } from '../court-schedules/court-schedules.service';
import { JwtService } from '@nestjs/jwt';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';

const OWNER_PUBLIC_ID = 'owner-uuid';

const baseDto: CreateOnboardingDto = {
  companyName: 'Arena Central',
  companyPhone: '(51) 99999-9999',
  cep: '90010-000',
  street: 'Rua dos Andradas',
  number: '1000',
  neighborhood: 'Centro Histórico',
  city: 'Porto Alegre',
  uf: 'RS',
  weekTemplate: [
    { day_of_week_ref: 1, hours: ['08:00', '09:00'] },
    { day_of_week_ref: 2, hours: ['08:00'] },
  ],
  courts: [
    {
      name: 'Q1',
      sports: ['Futsal', 'Beach tennis'],
      floor: 'madeira',
      price: 100,
    },
    {
      name: 'Q2',
      sports: ['Futsal'],
      floor: 'areia',
      price: 180,
    },
  ],
};

describe('OnboardingService', () => {
  let service: OnboardingService;
  let personRepo: Record<string, jest.Mock>;
  let sportRepo: Record<string, jest.Mock>;
  let daysRepo: Record<string, jest.Mock>;
  let courtSchedules: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;

  let companySave: jest.Mock;
  let courtSave: jest.Mock;
  let operatingSave: jest.Mock;
  let transaction: jest.Mock;
  let companyFindOne: jest.Mock;

  beforeEach(async () => {
    let courtSeq = 0;
    companySave = jest.fn().mockResolvedValue({
      id: 10,
      public_id: 'company-uuid',
      name: 'Arena Central',
      slug: 'arena-central',
    });
    courtSave = jest.fn().mockImplementation((c) =>
      Promise.resolve({
        ...c,
        id: 100 + courtSeq,
        public_id: `court-${courtSeq++}`,
      }),
    );
    operatingSave = jest.fn().mockResolvedValue(undefined);
    companyFindOne = jest.fn().mockResolvedValue(null);

    const companyExist = jest.fn().mockResolvedValue(false);

    const reposByEntity = new Map<
      unknown,
      {
        create: jest.Mock;
        save: jest.Mock;
        findOne?: jest.Mock;
        exist?: jest.Mock;
      }
    >([
      [
        Company,
        {
          create: jest.fn((x) => x),
          save: companySave,
          findOne: companyFindOne,
          exist: companyExist,
        },
      ],
      [Court, { create: jest.fn((x) => x), save: courtSave }],
      [OperatingSchedule, { create: jest.fn((x) => x), save: operatingSave }],
    ]);
    const manager = {
      getRepository: (entity: unknown) => reposByEntity.get(entity),
    };
    transaction = jest.fn((cb) => cb(manager));

    let sportSeq = 0;
    personRepo = { findOne: jest.fn() };
    sportRepo = {
      find: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) =>
        Promise.resolve(
          Array.isArray(x)
            ? x.map((s) => ({ ...s, id: 900 + sportSeq++ }))
            : { ...x, id: 900 + sportSeq++ },
        ),
      ),
    };
    daysRepo = { find: jest.fn() };
    courtSchedules = {
      populateCourtSchedule: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = { sign: jest.fn().mockReturnValue('new-jwt-token') };

    const companyRepo = {
      manager: { transaction },
      findOne: companyFindOne,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(Person), useValue: personRepo },
        { provide: getRepositoryToken(Sport), useValue: sportRepo },
        { provide: getRepositoryToken(DaysOfWeek), useValue: daysRepo },
        { provide: CourtSchedulesService, useValue: courtSchedules },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  function mockValidLookups() {
    personRepo.findOne.mockResolvedValue({
      id: 5,
      public_id: 'owner-uuid',
      username: 'owner',
      status: true,
      companies: [],
    });
    sportRepo.find.mockResolvedValue([
      { id: 1, name: 'Futsal' },
      { id: 2, name: 'Beach tennis' },
    ]);
    daysRepo.find.mockResolvedValue([
      { id: 2, ref: 1 },
      { id: 3, ref: 2 },
    ]);
  }

  it('lança NotFound quando o dono não existe', async () => {
    personRepo.findOne.mockResolvedValue(null);
    await expect(service.complete(OWNER_PUBLIC_ID, baseDto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lança Forbidden quando o e-mail não foi confirmado', async () => {
    personRepo.findOne.mockResolvedValue({
      id: 5,
      status: false,
      companies: [],
    });
    await expect(service.complete(OWNER_PUBLIC_ID, baseDto)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('é idempotente quando o dono já tem estabelecimento', async () => {
    personRepo.findOne.mockResolvedValue({
      id: 5,
      public_id: 'owner-uuid',
      username: 'owner',
      status: true,
    });
    companyFindOne.mockResolvedValue({
      id: 1,
      public_id: 'existing-company',
      name: 'Arena Existente',
      courts: [{ public_id: 'court-a', name: 'Q1' }],
    });

    const result = await service.complete(OWNER_PUBLIC_ID, baseDto);

    expect(result.companyPublicId).toBe('existing-company');
    expect(result.companyName).toBe('Arena Existente');
    expect(result.access_token).toBe('new-jwt-token');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('cria no catálogo os esportes que ainda não existem', async () => {
    personRepo.findOne.mockResolvedValue({
      id: 5,
      public_id: 'owner-uuid',
      username: 'owner',
      status: true,
      companies: [],
    });
    // Só "Futsal" existe; "Beach tennis" deve ser criado.
    sportRepo.find.mockResolvedValue([{ id: 1, name: 'Futsal' }]);
    daysRepo.find.mockResolvedValue([
      { id: 2, ref: 1 },
      { id: 3, ref: 2 },
    ]);

    await service.complete(OWNER_PUBLIC_ID, baseDto);

    expect(sportRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Beach tennis', needsNet: false }),
    ]);
  });

  it('lança BadRequest quando o dia da semana é inválido', async () => {
    mockValidLookups();
    daysRepo.find.mockResolvedValue([{ id: 2, ref: 1 }]); // falta ref 2
    await expect(service.complete(OWNER_PUBLIC_ID, baseDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('cria empresa, quadras e grade com preço por quadra e popula a agenda', async () => {
    mockValidLookups();

    const result = await service.complete(OWNER_PUBLIC_ID, baseDto);

    expect(companySave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Arena Central',
        phone: '51999999999',
        cep: '90010-000',
        street: 'Rua dos Andradas',
        number: '1000',
        neighborhood: 'Centro Histórico',
        city: 'Porto Alegre',
        uf: 'RS',
        slug: 'arena-central',
        administrator_id: 5,
        is_active: false,
      }),
    );

    // 2 quadras criadas
    expect(courtSave).toHaveBeenCalledTimes(2);
    expect(courtSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Q1', floor: 'madeira', company_id: 10 }),
    );

    // Grade: 3 horas totais no template -> 3 linhas por quadra.
    const rowsCourt1 = operatingSave.mock.calls[0][0];
    expect(rowsCourt1).toHaveLength(3);
    expect(rowsCourt1.every((r: OperatingSchedule) => r.price === 100)).toBe(
      true,
    );
    const rowsCourt2 = operatingSave.mock.calls[1][0];
    expect(rowsCourt2.every((r: OperatingSchedule) => r.price === 180)).toBe(
      true,
    );

    // Popula a agenda em background (não bloqueia a resposta).
    await new Promise((resolve) => setImmediate(resolve));
    expect(courtSchedules.populateCourtSchedule).toHaveBeenCalledTimes(2);

    expect(result.companyPublicId).toBe('company-uuid');
    expect(result.courts).toHaveLength(2);
    expect(result.schedulesPopulated).toBe(false);

    // Reemite token com o estabelecimento recém-criado.
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ companyPublicId: 'company-uuid' }),
    );
    expect(result.access_token).toBe('new-jwt-token');
  });

  it('retorna schedulesPopulated=false quando o populate falha', async () => {
    mockValidLookups();
    courtSchedules.populateCourtSchedule.mockRejectedValue(new Error('boom'));

    const result = await service.complete(OWNER_PUBLIC_ID, baseDto);
    expect(result.schedulesPopulated).toBe(false);
  });
});
