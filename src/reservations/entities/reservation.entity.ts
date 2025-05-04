import { Exclude, Expose } from 'class-transformer';
import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'reservations' })
export class Reservation {
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

  @Column({ length: 50 })
  @Expose()
  contact_name: string;

  @Column({ type: 'char', length: 11 })
  @Expose()
  contact_phone: string;

  @Column({ type: 'text', nullable: true })
  @Expose()
  token_to_cancel: string;

  @Column({ default: false })
  @Expose()
  is_canceled: boolean;

  @Column({ default: false })
  @Expose()
  is_prepaid: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @Expose()
  canceled_at: Date;

  @Column()
  @Exclude()
  court_schedule_id: number;

  @OneToOne(() => CourtSchedule)
  @JoinColumn({ name: 'court_schedule_id' })
  court_schedule: CourtSchedule;
}
