import { Test, TestingModule } from '@nestjs/testing';
import { CourtSchedulesService } from './court-schedules.service';

describe('CourtSchedulesService', () => {
  let service: CourtSchedulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourtSchedulesService],
    }).compile();

    service = module.get<CourtSchedulesService>(CourtSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
