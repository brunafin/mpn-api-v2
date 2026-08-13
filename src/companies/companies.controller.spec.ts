import { GoneException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

describe('CompaniesController', () => {
  let controller: CompaniesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [CompaniesService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /companies legado retorna 410', () => {
    expect(() =>
      controller.create({} as CreateCompanyDto, { user: { userId: 'owner-1' } }),
    ).toThrow(GoneException);
  });
});
