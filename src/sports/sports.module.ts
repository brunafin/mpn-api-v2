import { Module } from '@nestjs/common';
import { SportsService } from './sports.service';
import { SportsController } from './sports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Court } from 'src/courts/entities/court.entity';
import { Sport } from './entities/sport.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sport, Court])],
  controllers: [SportsController],
  providers: [SportsService],
})
export class SportsModule { }
