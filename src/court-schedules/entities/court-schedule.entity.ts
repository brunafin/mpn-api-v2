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

@Entity({ schema: 'web', name: 'court_schedule' })
@Unique(['start_hour', 'date', 'court_id'])
export class CourtSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  start_hour: string;

  @Column()
  end_hour: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: true })
  available: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
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
