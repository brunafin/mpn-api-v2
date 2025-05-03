import { Exclude, Expose } from 'class-transformer';
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

  @Column({ nullable: true, type: 'text' })
  @Expose()
  logo_url: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  instagram_url: string;

  @Column({ nullable: true, type: 'text' })
  @Expose()
  facebook_url: string;

  @Column({ length: 100, nullable: true })
  @Exclude()
  email: string;

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

  @Column()
  @Exclude()
  administrator_id: number;

  @ManyToOne(() => Person, (person) => person.companies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'administrator_id' })
  @Exclude()
  administrator: Person;

  @OneToMany(() => Court, (court) => court.company)
  @Expose()
  courts: Court[];

  @OneToMany(() => CompanyImage, (image) => image.company)
  @Expose()
  images: CompanyImage[];
}
