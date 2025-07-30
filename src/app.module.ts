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
import { OperatingScheduleModule } from './operating-schedule/operating-schedule.module';
import { OperatingSchedule } from './operating-schedule/entities/operating-schedule.entity';
import { CourtsModule } from './courts/courts.module';
import { Court } from './courts/entities/court.entity';
import { TypeOfCourtModule } from './type-of-court/type-of-court.module';
import { TypeOfCourt } from './type-of-court/entities/type-of-court.entity';
import { CourtSchedulesModule } from './court-schedules/court-schedules.module';
import { CourtSchedule } from './court-schedules/entities/court-schedule.entity';
import { ReservationsModule } from './reservations/reservations.module';
import { Reservation } from './reservations/entities/reservation.entity';
import { CompanyImagesModule } from './company-images/company-images.module';
import { CompanyImage } from './company-images/entities/company-image.entity';
import { SportsModule } from './sports/sports.module';
import { Sport } from './sports/entities/sport.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CompaniesCustomerModule } from './companies-customer/companies-customer.module';
import { CompanyCustomer } from './companies-customer/entities/company-customer.entity';
import { TwilioModule } from './twilio/twilio.module';
import { ZenviaModule } from './zenvia-sms/zenvia-sms.module';
import { NotesModule } from './notes/notes.module';
import { Note } from './notes/entities/note.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      synchronize: true,
      entities: [
        Person,
        Company,
        DaysOfWeek,
        OperatingSchedule,
        Court,
        TypeOfCourt,
        CourtSchedule,
        Reservation,
        CompanyImage,
        Sport,
        CompanyCustomer,
        Note,
      ],
    }),
    PeopleModule,
    CompaniesModule,
    DaysOfWeekModule,
    OperatingScheduleModule,
    CourtsModule,
    TypeOfCourtModule,
    CourtSchedulesModule,
    ReservationsModule,
    CompanyImagesModule,
    CompanyImagesModule,
    SportsModule,
    AuthModule,
    CompaniesCustomerModule,
    TwilioModule,
    ZenviaModule,
    NotesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
