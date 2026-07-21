import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesCustomerController } from './companies-customer.controller';
import { CompaniesCustomerService } from './companies-customer.service';

describe('CompaniesCustomerController', () => {
  let controller: CompaniesCustomerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesCustomerController],
      providers: [CompaniesCustomerService],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CompaniesCustomerController>(
      CompaniesCustomerController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
