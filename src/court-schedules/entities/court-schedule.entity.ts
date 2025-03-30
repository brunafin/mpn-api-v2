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
  id: number;

  @Column({ type: 'time' })
  start_hour: string;

  @Column({ type: 'time' })
  end_hour: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: true })
  available: boolean;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column()
  court_id: number;

  @Column()
  day_of_week_id: number;

  @ManyToOne(() => Court, (court) => court.court_schedule)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @OneToOne(() => Reservation, (reservation) => reservation.court_schedule)
  reservation: Reservation;

  @ManyToOne(() => DaysOfWeek, (day) => day.court_schedule)
  @JoinColumn({ name: 'day_of_week_id' })
  day_of_week: DaysOfWeek;
}
