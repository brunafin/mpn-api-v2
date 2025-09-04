import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCompanyService } from './payment_company.service';

describe('PaymentCompanyService', () => {
  let service: PaymentCompanyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentCompanyService],
    }).compile();

    service = module.get<PaymentCompanyService>(PaymentCompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
