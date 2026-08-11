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

  @Column({ type: 'varchar', length: 50, nullable: true })
  fixed_contact_name: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  fixed_contact_phone: string | null;

  @Column({ type: 'int', nullable: true })
  sport_id: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * false = horário interno (agenda do manager / fixo privado);
   * não entra em where-to-play / available-hours.
   */
  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  @ManyToOne(() => Court, (court) => court.operating_schedule)
  @JoinColumn({ name: 'court_id' })
  court: Court;

  @ManyToOne(() => DaysOfWeek, (day) => day.operating_schedule)
  @JoinColumn({ name: 'day_of_week_id' })
  day_of_week: DaysOfWeek;

  @ManyToOne(() => Sport)
  @JoinColumn({ name: 'sport_id', referencedColumnName: 'id' })
  sport: Sport;
}
