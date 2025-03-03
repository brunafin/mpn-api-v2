import { Test, TestingModule } from '@nestjs/testing';
import { OperatingScheduleService } from './operating-schedule.service';

describe('OperatingScheduleService', () => {
  let service: OperatingScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OperatingScheduleService],
    }).compile();

    service = module.get<OperatingScheduleService>(OperatingScheduleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
