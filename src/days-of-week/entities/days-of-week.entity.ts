import { OperatingSchedule } from 'src/operating_schedule/entities/operating_schedule.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'web', name: 'days_of_week' })
export class DaysOfWeek {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 3 })
  abbreviation: string;

  @Column({ length: 50 })
  description: string;

  @Column({ type: 'int' })
  ref: number;

  @OneToMany(
    () => OperatingSchedule,
    (operating_schedule) => operating_schedule.day_of_week,
  )
  operating_schedule: OperatingSchedule[];

  // @OneToMany(() => Horario, (horario) => horario.diaSemana)
  // horarios: Horario[];
}
