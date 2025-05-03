import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { Column, Entity, JoinTable, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Court } from 'src/courts/entities/court.entity';
import { ManyToMany } from 'typeorm';

@Entity({ name: 'sport' })
export class Sport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  name: string;

  @ManyToMany(() => Court, (court) => court.sports)
  @JoinTable({
    name: 'court_sports',
    joinColumn: {
      name: 'sport_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'court_id',
      referencedColumnName: 'id',
    },
  })
  courts: Court[];
}
