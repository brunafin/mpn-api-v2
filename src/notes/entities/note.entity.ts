import { Expose } from 'class-transformer';
import { Company } from 'src/companies/entities/company.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'notes' })
export class Note {
  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @Column({ type: 'date' })
  @Expose()
  date: Date;

  @Column({ type: 'text', nullable: true })
  @Expose()
  title: string | null;

  @Column({ type: 'text' })
  @Expose()
  message: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Expose()
  sender: string | null;

  @Column({ default: false })
  @Expose()
  is_read: boolean;

  @Column({ type: 'int' })
  @Expose()
  company_id: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id', referencedColumnName: 'id' })
  company: Company;
}
