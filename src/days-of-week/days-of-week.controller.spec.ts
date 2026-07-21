import { Test, TestingModule } from '@nestjs/testing';
import { DaysOfWeekController } from './days-of-week.controller';
import { DaysOfWeekService } from './days-of-week.service';

describe('DaysOfWeekController', () => {
  let controller: DaysOfWeekController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DaysOfWeekController],
      providers: [DaysOfWeekService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<DaysOfWeekController>(DaysOfWeekController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
