import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SportsController } from './sports.controller';
import { SportsService } from './sports.service';
import { Sport } from './entities/sport.entity';

describe('SportsController', () => {
  let controller: SportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SportsController],
      providers: [
        SportsService,
        { provide: getRepositoryToken(Sport), useValue: {} },
      ],
    }).compile();

    controller = module.get<SportsController>(SportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
