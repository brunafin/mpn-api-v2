import { Company } from 'src/companies/entities/company.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'web' })
export class Person {
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
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 11, nullable: true })
  cpf: string;

  @Column({ nullable: true })
  born_date: Date;

  @Column({ length: 9, nullable: true })
  cep: string;

  @Column({ length: 100, nullable: true })
  street: string;

  @Column({ length: 10, nullable: true })
  number: string;

  @Column({ length: 50, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  neighborhood: string;

  @Column({ length: 2, nullable: true })
  uf: string;

  @Column()
  status: boolean;

  @OneToMany(() => Company, (company) => company.administrator)
  companies: Company[];
}
