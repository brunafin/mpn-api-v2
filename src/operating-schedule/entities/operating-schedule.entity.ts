import { Court } from 'src/courts/entities/court.entity';
import { DaysOfWeek } from 'src/days-of-week/entities/days-of-week.entity';
import { CompanyCustomer } from 'src/companies-customer/entities/company-customer.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Sport } from 'src/sports/entities/sport.entity';

@Entity()
@Unique(['hour', 'court_id', 'day_of_week_id'])
export class OperatingSchedule {
  @PrimaryColumn({ type: 'time' })
  hour: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'boolean', default: false })
  is_fixed: boolean;

  @PrimaryColumn()
  day_of_week_id: number;

  @PrimaryColumn()
  court_id: number;

  @Column({ nullable: true })
  company_customer_id: number | null;

  @Column({ type: 'int', nullable: true })
  sport_id: number | null;

  @ManyToOne(() => Court, (court) => court.operating_schedule)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @ManyToOne(() => DaysOfWeek, (day) => day.operating_schedule)
  @JoinColumn({ name: 'day_of_week_id' })
  day_of_week: DaysOfWeek;

  @ManyToOne(() => CompanyCustomer, { nullable: true })
  @JoinColumn({ name: 'company_customer_id' })
  company_customer: CompanyCustomer;

  @ManyToOne(() => Sport)
  @JoinColumn({ name: 'sport_id', referencedColumnName: 'id' })
  sport: Sport;
}
