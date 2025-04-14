import { Court } from 'src/courts/entities/court.entity';
import { DaysOfWeek } from 'src/days-of-week/entities/days-of-week.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';

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

  @ManyToOne(() => Court, (court) => court.operating_schedule)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @ManyToOne(() => DaysOfWeek, (day) => day.operating_schedule)
  @JoinColumn({ name: 'day_of_week_id' })
  day_of_week: DaysOfWeek;
}
