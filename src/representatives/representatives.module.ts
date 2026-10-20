import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { Person } from 'src/people/entities/person.entity';
import { PeopleModule } from 'src/people/people.module';
import { RepresentativePayout } from './entities/representative-payout.entity';
import { RepresentativeProfile } from './entities/representative-profile.entity';
import { RepresentativesController } from './representatives.controller';
import { RepresentativesService } from './representatives.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Person,
      RepresentativeProfile,
      RepresentativePayout,
      Company,
    ]),
    PeopleModule,
  ],
  controllers: [RepresentativesController],
  providers: [RepresentativesService],
  exports: [RepresentativesService],
})
export class RepresentativesModule {}
