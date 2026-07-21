import { Test, TestingModule } from '@nestjs/testing';
import { CompanyImagesController } from './company-images.controller';
import { CompanyImagesService } from './company-images.service';

describe('CompanyImagesController', () => {
  let controller: CompanyImagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyImagesController],
      providers: [CompanyImagesService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CompanyImagesController>(CompanyImagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
