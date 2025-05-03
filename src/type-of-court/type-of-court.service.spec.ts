import { Test, TestingModule } from '@nestjs/testing';
import { TypeOfCourtService } from './type-of-court.service';

describe('TypeOfCourtService', () => {
  let service: TypeOfCourtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypeOfCourtService],
    }).compile();

    service = module.get<TypeOfCourtService>(TypeOfCourtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
