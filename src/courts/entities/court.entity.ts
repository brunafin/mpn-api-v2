import { Company } from 'src/companies/entities/company.entity';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { TypeOfCourt } from 'src/type-of-court/entities/type-of-court.entity';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Court {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @Column({ length: 100 })
  name: string;

  @Check(`"note_stars" >= 0 AND "note_stars" <= 5`)
  @Column({ type: 'real', nullable: true })
  note_stars: number;

  @Column()
  company_id: number;

  @Column()
  type_of_court_id: number;

  @Column({ default: false })
  show: boolean;

  @OneToMany(() => CourtSchedule, (court_schedule) => court_schedule.court)
  court_schedule: CourtSchedule[];

  @OneToMany(
    () => OperatingSchedule,
    (operating_schedule) => operating_schedule.court,
  )
  operating_schedule: OperatingSchedule[];

  @ManyToOne(() => Company, (company) => company.id)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => TypeOfCourt, (type) => type.id)
  @JoinColumn({ name: 'type_of_court_id' })
  type_of_court: TypeOfCourt;
}
