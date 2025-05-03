import { Exclude, Expose } from 'class-transformer';
import { Company } from 'src/companies/entities/company.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Person {
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
  name: string;

  @Column({ type: 'char', length: 11, nullable: true })
  @Expose()
  phone: string;

  @Column({ length: 100, nullable: true })
  @Expose()
  email: string;

  @Column({ type: 'char', length: 11, nullable: true })
  @Expose()
  cpf: string;

  @Column({ nullable: true })
  @Expose()
  born_date: Date;

  @Column({ type: 'char', length: 9, nullable: true })
  @Expose()
  cep: string;

  @Column({ length: 100, nullable: true })
  @Expose()
  street: string;

  @Column({ length: 10, nullable: true })
  @Expose()
  number: string;

  @Column({ length: 50, nullable: true })
  @Expose()
  city: string;

  @Column({ length: 50, nullable: true })
  @Expose()
  neighborhood: string;

  @Column({ type: 'char', length: 2, nullable: true })
  @Expose()
  uf: string;

  @Column({ default: true })
  @Expose()
  status: boolean;

  @OneToMany(() => Company, (company) => company.administrator)
  companies: Company[];
}
