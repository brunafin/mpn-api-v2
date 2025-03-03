import { Test, TestingModule } from '@nestjs/testing';
import { TypeOfCourtController } from './type-of-court.controller';
import { TypeOfCourtService } from './type-of-court.service';

describe('TypeOfCourtController', () => {
  let controller: TypeOfCourtController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TypeOfCourtController],
      providers: [TypeOfCourtService],
    }).compile();

    controller = module.get<TypeOfCourtController>(TypeOfCourtController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
