import { Test, TestingModule } from '@nestjs/testing';
import { GoogleCourtsService } from './google_courts.service';

describe('GoogleCourtsService', () => {
  let service: GoogleCourtsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleCourtsService],
    }).compile();

    service = module.get<GoogleCourtsService>(GoogleCourtsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
