import { CompanyImage } from 'src/company-images/entities/company-image.entity';
import { Court } from 'src/courts/entities/court.entity';
import { Person } from 'src/people/entities/person.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Company {
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

  @Column({ type: 'char', length: 11, nullable: true })
  phone: string;

  @Column({ nullable: true, type: 'text' })
  logo_url: string;

  @Column({ nullable: true, type: 'text' })
  instagram_url: string;

  @Column({ nullable: true, type: 'text' })
  facebook_url: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ type: 'char', length: 9, nullable: true })
  cep: string;

  @Column({ length: 100, nullable: true })
  street: string;

  @Column({ length: 10, nullable: true })
  number: string;

  @Column({ length: 50, nullable: true })
  city: string;

  @Column({ length: 50, nullable: true })
  neighborhood: string;

  @Column({ type: 'char', length: 2, nullable: true })
  uf: string;

  @Column()
  administrator_id: number;

  @ManyToOne(() => Person, (person) => person.companies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'administrator_id' })
  administrator: Person;

  @OneToMany(() => Court, (court) => court.company)
  courts: Court[];

  @OneToMany(() => CompanyImage, (image) => image.company)
  images: CompanyImage[];
}
