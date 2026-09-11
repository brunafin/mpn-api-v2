import { Exclude } from 'class-transformer';
import { Person } from 'src/people/entities/person.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'representative_profile' })
export class RepresentativeProfile {
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

  @Column({ type: 'int', unique: true })
  @Exclude()
  person_id: number;

  @OneToOne(() => Person, (person) => person.representativeProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id' })
  person: Person;

  /** Percentual da 1ª mensalidade paga (padrão 100). */
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 100 })
  first_month_percent: number;

  /** Percentual das mensalidades seguintes (padrão 25). */
  @Column({ type: 'numeric', precision: 5, scale: 2, default: 25 })
  recurring_percent: number;
}
