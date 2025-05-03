import { Test, TestingModule } from '@nestjs/testing';
import { DaysOfWeekService } from './days-of-week.service';

describe('DaysOfWeekService', () => {
  let service: DaysOfWeekService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DaysOfWeekService],
    }).compile();

    service = module.get<DaysOfWeekService>(DaysOfWeekService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
