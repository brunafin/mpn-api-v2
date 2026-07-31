import { Exclude, Expose } from 'class-transformer';
import { Company } from 'src/companies/entities/company.entity';
import { PersonRole } from 'src/people/enums/person-role.enum';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('UQ_person_cpf', ['cpf'], {
  unique: true,
  where: '"cpf" IS NOT NULL',
})
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

  @Column({ length: 20, unique: true })
  @Expose()
  username: string;

  @Column({ type: 'varchar', length: 32, default: PersonRole.OWNER })
  @Expose()
  role: PersonRole;

  @Column({ type: 'timestamptz', nullable: true })
  @Expose()
  last_login_at: Date | null;

  /** Aceite dos Termos de Uso e da Política de Privacidade no cadastro. */
  @Column({ type: 'timestamptz', nullable: true })
  @Expose()
  terms_accepted_at: Date | null;

  /** Senha local; null em contas criadas só via Google. */
  @Column({ type: 'text', nullable: true })
  @Exclude()
  password: string | null;

  /** Subject estável do Google Identity (`sub` do id_token). */
  @Index('UQ_person_google_sub', {
    unique: true,
    where: '"google_sub" IS NOT NULL',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  google_sub: string | null;

  @OneToMany(() => Company, (company) => company.administrator)
  companies: Company[];
}
