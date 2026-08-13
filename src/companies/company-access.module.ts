import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WriteAccessGuard } from 'src/common/guards/write-access.guard';
import { Company } from 'src/companies/entities/company.entity';
import { TrialExpiryService } from 'src/companies/trial-expiry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [WriteAccessGuard, TrialExpiryService],
  exports: [WriteAccessGuard, TrialExpiryService, TypeOrmModule],
})
export class CompanyAccessModule {}
