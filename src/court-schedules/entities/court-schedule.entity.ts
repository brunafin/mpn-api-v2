import { Exclude, Expose } from 'class-transformer';
import { CompanyCustomer } from 'src/companies-customer/entities/company-customer.entity';
import { Court } from 'src/courts/entities/court.entity';
import { DaysOfWeek } from 'src/days-of-week/entities/days-of-week.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'court_schedule' })
@Unique(['start_hour', 'date', 'court_id'])
export class CourtSchedule {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  @Expose()
  public_id: string;

  @Column({ type: 'time' })
  @Expose()
  start_hour: string;

  @Column({ type: 'time' })
  @Expose()
  end_hour: string;

  @Column({ type: 'date' })
  @Expose()
  date: Date;

  @Column({ default: true })
  @Expose()
  available: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  @Expose()
  price: number;

  @Column()
  @Exclude()
  court_id: number;

  @Column()
  @Expose()
  day_of_week_id: number;

  @Column({ type: 'boolean', default: false })
  @Expose()
  is_fixed: boolean;

  @ManyToOne(() => Court, (court) => court.court_schedule)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @OneToOne(() => Reservation, (reservation) => reservation.court_schedule)
  reservation: Reservation;

  @ManyToOne(() => DaysOfWeek, (day) => day.court_schedule)
  @JoinColumn({ name: 'day_of_week_id' })
  day_of_week: DaysOfWeek;

  @Column({ nullable: true })
  @Expose()
  company_customer_id: number | null;

  @ManyToOne(() => CompanyCustomer, { nullable: true })
  @JoinColumn({ name: 'company_customer_id' })
  @Expose()
  company_customer: CompanyCustomer;
}
