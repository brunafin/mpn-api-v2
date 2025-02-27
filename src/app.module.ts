import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PeopleModule } from './people/people.module';
import { Person } from './people/entities/person.entity';
import { CompaniesModule } from './companies/companies.module';
import { Company } from './companies/entities/company.entity';
import { DaysOfWeekModule } from './days-of-week/days-of-week.module';
import { DaysOfWeek } from './days-of-week/entities/days-of-week.entity';
import { OperatingScheduleModule } from './operating_schedule/operating_schedule.module';
import { OperatingSchedule } from './operating_schedule/entities/operating_schedule.entity';
import { CourtsModule } from './courts/courts.module';
import { Court } from './courts/entities/court.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      synchronize: true,
      entities: [Person, Company, DaysOfWeek, OperatingSchedule, Court],
    }),
    PeopleModule,
    CompaniesModule,
    DaysOfWeekModule,
    OperatingScheduleModule,
    CourtsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
