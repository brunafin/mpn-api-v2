import { Exclude, Expose } from 'class-transformer';
import { Company } from 'src/companies/entities/company.entity';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { Sport } from 'src/sports/entities/sport.entity';
import { TypeOfCourt } from 'src/type-of-court/entities/type-of-court.entity';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Court {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  @Expose()
  public_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Exclude()
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  @Exclude()
  updated_at: Date;

  @Column({ length: 100 })
  @Expose()
  name: string;

  @Check(`"note_stars" >= 0 AND "note_stars" <= 5`)
  @Column({ type: 'real', nullable: true })
  @Expose()
  note_stars: number;

  @Column()
  @Exclude()
  company_id: number;

  @Column()
  @Expose()
  type_of_court_id: number;

  @Column({ default: false })
  @Expose()
  show: boolean;

  @Column({ type: 'varchar', length: 30, nullable: true })
  @Expose()
  floor: string | null;

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

  @Column({ default: true })
  @Expose()
  is_covered: boolean;

  @Column({ default: false })
  @Expose()
  is_can_have_net: boolean;

  @ManyToOne(() => TypeOfCourt, (type) => type.id)
  @JoinColumn({ name: 'type_of_court_id' })
  type_of_court: TypeOfCourt;

  @ManyToMany(() => Sport, (sport) => sport.courts)
  @JoinTable({
    name: 'court_sports',
    joinColumn: {
      name: 'court_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'sport_id',
      referencedColumnName: 'id',
    },
  })
  court_sports: Sport[];
}
