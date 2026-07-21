import { Person } from '../people/entities/person.entity';
import { Company } from '../companies/entities/company.entity';
import { DaysOfWeek } from '../days-of-week/entities/days-of-week.entity';
import { OperatingSchedule } from '../operating-schedule/entities/operating-schedule.entity';
import { Court } from '../courts/entities/court.entity';
import { TypeOfCourt } from '../type-of-court/entities/type-of-court.entity';
import { CourtSchedule } from '../court-schedules/entities/court-schedule.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CompanyImage } from '../company-images/entities/company-image.entity';
import { Sport } from '../sports/entities/sport.entity';
import { CompanyCustomer } from '../companies-customer/entities/company-customer.entity';
import { Note } from '../notes/entities/note.entity';
import { Plan } from '../plans/entities/plan.entity';
import { PaymentCompany } from '../payment_company/entities/payment_company.entity';
import { City } from '../cities/entities/city.entity';
import { GoogleCourt } from '../google_courts/entities/google_court.entity';
import { EmailVerification } from '../auth/entities/email-verification.entity';

/**
 * Fonte única das entidades TypeORM. Reutilizada pelo AppModule (runtime) e
 * pelo DataSource da CLI de migrations, evitando divergência entre os dois.
 */
export const entities = [
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
  Plan,
  PaymentCompany,
  City,
  GoogleCourt,
  EmailVerification,
];
