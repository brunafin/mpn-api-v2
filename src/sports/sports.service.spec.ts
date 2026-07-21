import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SportsService } from './sports.service';
import { Sport } from './entities/sport.entity';

describe('SportsService', () => {
  let service: SportsService;
  const repo = {
    find: jest.fn().mockResolvedValue([{ id: 1, name: 'Futsal' }]),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SportsService,
        { provide: getRepositoryToken(Sport), useValue: repo },
      ],
    }).compile();

    service = module.get<SportsService>(SportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll retorna a lista de esportes do repositório', async () => {
    const result = await service.findAll();
    expect(repo.find).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, name: 'Futsal' }]);
  });
});
