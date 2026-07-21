import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesCustomerService } from './companies-customer.service';

describe('CompaniesCustomerService', () => {
  let service: CompaniesCustomerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompaniesCustomerService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<CompaniesCustomerService>(CompaniesCustomerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
