import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'day_of_week' })
export class DaysOfWeek {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'char', length: 3 })
  abbreviation: string;

  @Column({ length: 13 })
  description: string;

  @Column({ enum: [0, 1, 2, 3, 4, 5, 6] })
  ref: number;

  @OneToMany(
    () => OperatingSchedule,
    (operating_schedule) => operating_schedule.day_of_week,
  )
  operating_schedule: OperatingSchedule[];

  @OneToMany(
    () => CourtSchedule,
    (court_schedule) => court_schedule.day_of_week,
  )
  court_schedule: CourtSchedule[];
}
