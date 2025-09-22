import { Module } from '@nestjs/common';
import { GoogleCourtsService } from './google_courts.service';
import { GoogleCourtsController } from './google_courts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCourt } from './entities/google_court.entity';
import { City } from 'src/cities/entities/city.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GoogleCourt, City])],
  controllers: [GoogleCourtsController],
  providers: [GoogleCourtsService],
})
export class GoogleCourtsModule {}
