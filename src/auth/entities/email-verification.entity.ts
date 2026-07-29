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
import { EmailVerificationPurpose } from '../enums/email-verification-purpose.enum';

/**
 * Código de verificação enviado por e-mail (cadastro ou recuperação de senha).
 * Uma linha por tentativa; o reenvio invalida a anterior ao consumir e criar nova.
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

  @Index()
  @Column({
    type: 'varchar',
    length: 32,
    default: EmailVerificationPurpose.EMAIL_VERIFICATION,
  })
  purpose: EmailVerificationPurpose;

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
