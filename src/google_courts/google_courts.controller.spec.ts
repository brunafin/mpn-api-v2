import { Test, TestingModule } from '@nestjs/testing';
import { GoogleCourtsController } from './google_courts.controller';
import { GoogleCourtsService } from './google_courts.service';

describe('GoogleCourtsController', () => {
  let controller: GoogleCourtsController;
  const service = {
    list: jest.fn(),
    listCities: jest.fn(),
    findOne: jest.fn(),
    updateOutreach: jest.fn(),
    searchCity: jest.fn(),
    importPlaces: jest.fn(),
    create: jest.fn(),
    createBatch: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleCourtsController],
      providers: [{ provide: GoogleCourtsService, useValue: service }],
    }).compile();

    controller = module.get<GoogleCourtsController>(GoogleCourtsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
