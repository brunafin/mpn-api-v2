import { Company } from 'src/companies/entities/company.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'web' })
export class CompanyImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  url: string;

  @Column()
  company_id: number;

  @ManyToOne(() => Company, (company) => company.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}
