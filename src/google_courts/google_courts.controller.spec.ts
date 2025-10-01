import { Test, TestingModule } from '@nestjs/testing';
import { GoogleCourtsController } from './google_courts.controller';
import { GoogleCourtsService } from './google_courts.service';

describe('GoogleCourtsController', () => {
  let controller: GoogleCourtsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleCourtsController],
      providers: [GoogleCourtsService],
    }).compile();

    controller = module.get<GoogleCourtsController>(GoogleCourtsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
