import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingModule } from 'src/billing/billing.module';
import { PublicListingCacheModule } from 'src/cache/cache.module';
import { CompanyAccessModule } from 'src/companies/company-access.module';
import { Company } from 'src/companies/entities/company.entity';
import { Court } from 'src/courts/entities/court.entity';
import { PaymentCompany } from 'src/payment_company/entities/payment_company.entity';
import { Person } from 'src/people/entities/person.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { PlatformController } from './platform.controller';
import { PlatformMaintenanceService } from './platform-maintenance.service';
import { PlatformService } from './platform.service';
import { RepresentativesModule } from 'src/representatives/representatives.module';
import { SiteMaintenanceController } from './site-maintenance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Person,
      PaymentCompany,
      Plan,
      Court,
      PlatformSetting,
    ]),
    CompanyAccessModule,
    BillingModule,
    PublicListingCacheModule,
    RepresentativesModule,
  ],
  controllers: [PlatformController, SiteMaintenanceController],
  providers: [PlatformService, PlatformMaintenanceService],
})
export class PlatformModule {}
