import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCompanyController } from './payment_company.controller';
import { PaymentCompanyService } from './payment_company.service';

describe('PaymentCompanyController', () => {
  let controller: PaymentCompanyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentCompanyController],
      providers: [PaymentCompanyService],
    }).compile();

    controller = module.get<PaymentCompanyController>(PaymentCompanyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
