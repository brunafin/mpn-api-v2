import { Company } from 'src/companies/entities/company.entity';
import { OperatingSchedule } from 'src/operating_schedule/entities/operating_schedule.entity';
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

  // @Column()
  // court_type_id: number;

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

  // @ManyToOne(() => CourtType, (type) => type.id)
  // court_type: CourtType;
}
