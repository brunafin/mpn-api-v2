import { Company } from 'src/companies/entities/company.entity';
import { OperatingSchedule } from 'src/operating-schedule/entities/operating-schedule.entity';
import { TypeOfCourt } from 'src/type-of-court/entities/type-of-court.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'web' })
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

  @Column()
  company_id: number;

  @Column()
  type_of_court_id: number;

  @Column()
  show: boolean;

  // @OneToMany(() => Hour, (hour) => hour.court)
  // hours: Hour[];

  @OneToMany(
    () => OperatingSchedule,
    (operating_schedule) => operating_schedule.court,
  )
  operating_schedule: OperatingSchedule[];

  @ManyToOne(() => Company, (company) => company.id)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => TypeOfCourt, (type) => type.id)
  type_of_court: TypeOfCourt;
}
