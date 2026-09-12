import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from 'src/cities/entities/city.entity';
import { Company } from 'src/companies/entities/company.entity';
import { GoogleCourt } from './entities/google_court.entity';
import { GoogleCourtsController } from './google_courts.controller';
import { GoogleCourtsService } from './google_courts.service';
import { GooglePlacesClient } from './google-places.client';

@Module({
  imports: [TypeOrmModule.forFeature([GoogleCourt, City, Company])],
  controllers: [GoogleCourtsController],
  providers: [GoogleCourtsService, GooglePlacesClient],
})
export class GoogleCourtsModule {}
