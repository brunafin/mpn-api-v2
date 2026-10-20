import { Exclude } from 'class-transformer';
import { Person } from 'src/people/entities/person.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/** Comissão paga ao representante em um mês. */
@Entity({ name: 'representative_payout' })
@Unique('UQ_representative_payout_month', ['person_id', 'year', 'month'])
export class RepresentativePayout {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

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

  @Column({ type: 'int' })
  @Exclude()
  person_id: number;

  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id' })
  person: Person;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'date' })
  paid_at: string;
}
