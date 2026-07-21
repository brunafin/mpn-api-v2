import { Test, TestingModule } from '@nestjs/testing';
import { CourtSchedulesController } from './court-schedules.controller';
import { CourtSchedulesService } from './court-schedules.service';

describe('CourtSchedulesController', () => {
  let controller: CourtSchedulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourtSchedulesController],
      providers: [CourtSchedulesService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CourtSchedulesController>(CourtSchedulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
