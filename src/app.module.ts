import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { PeopleModule } from './people/people.module';
import { CompaniesModule } from './companies/companies.module';
import { DaysOfWeekModule } from './days-of-week/days-of-week.module';
import { OperatingScheduleModule } from './operating-schedule/operating-schedule.module';
import { CourtsModule } from './courts/courts.module';
import { TypeOfCourtModule } from './type-of-court/type-of-court.module';
import { CourtSchedulesModule } from './court-schedules/court-schedules.module';
import { ReservationsModule } from './reservations/reservations.module';
import { CompanyImagesModule } from './company-images/company-images.module';
import { SportsModule } from './sports/sports.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { CompaniesCustomerModule } from './companies-customer/companies-customer.module';
import { NotesModule } from './notes/notes.module';
import { PlansModule } from './plans/plans.module';
import { PaymentCompanyModule } from './payment_company/payment_company.module';
import { GoogleCourtsModule } from './google_courts/google_courts.module';
import { CitiesModule } from './cities/cities.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { StorageModule } from './storage/storage.module';
import { ContactModule } from './contact/contact.module';
import { PublicListingCacheModule } from './cache/cache.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    PublicListingCacheModule,
    StorageModule,
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
    NotesModule,
    PlansModule,
    PaymentCompanyModule,
    GoogleCourtsModule,
    CitiesModule,
    OnboardingModule,
    ContactModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
