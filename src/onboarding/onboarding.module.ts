import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { Company } from 'src/companies/entities/company.entity';
import { Court } from 'src/courts/entities/court.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { DaysOfWeek } from 'src/days-of-week/entities/days-of-week.entity';
import { Sport } from 'src/sports/entities/sport.entity';
import { Person } from 'src/people/entities/person.entity';
import { CourtSchedulesModule } from 'src/court-schedules/court-schedules.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Court,
      OperatingSchedule,
      DaysOfWeek,
      Sport,
      Person,
    ]),
    CourtSchedulesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_MANAGER_LOGIN'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
