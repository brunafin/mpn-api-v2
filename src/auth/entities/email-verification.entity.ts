import { Person } from 'src/people/entities/person.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Código de verificação de e-mail enviado no cadastro do dono.
 * Uma linha por tentativa de verificação (o reenvio invalida a anterior
 * ao consumir/expirar e criar uma nova).
 */
@Entity({ name: 'email_verification' })
export class EmailVerification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'char', length: 6 })
  code: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  consumed_at: Date | null;

  @Column({ type: 'int' })
  person_id: number;

  @ManyToOne(() => Person, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'person_id', referencedColumnName: 'id' })
  person: Person;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
