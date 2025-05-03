import { Test, TestingModule } from '@nestjs/testing';
import { OperatingScheduleController } from './operating-schedule.controller';
import { OperatingScheduleService } from './operating-schedule.service';

describe('OperatingScheduleController', () => {
  let controller: OperatingScheduleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatingScheduleController],
      providers: [OperatingScheduleService],
    }).compile();

    controller = module.get<OperatingScheduleController>(
      OperatingScheduleController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
