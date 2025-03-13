import { CourtSchedule } from 'src/court-schedules/entities/court-schedule.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'web', name: 'reservations' })
export class Reservation {
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

  @Column({ length: 50 })
  contact_name: string;

  @Column({ length: 15 })
  contact_phone: string;

  @Column({ type: 'text', nullable: true })
  token_to_cancel: string;

  @Column({ default: false })
  is_canceled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  canceled_at: Date;

  @Column()
  court_schedule_id: number;

  @OneToOne(() => CourtSchedule)
  @JoinColumn({ name: 'court_schedule_id' })
  court_schedule: CourtSchedule;
}
