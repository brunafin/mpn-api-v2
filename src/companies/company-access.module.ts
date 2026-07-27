import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WriteAccessGuard } from 'src/common/guards/write-access.guard';
import { Company } from 'src/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [WriteAccessGuard],
  exports: [WriteAccessGuard, TypeOrmModule],
})
export class CompanyAccessModule {}
