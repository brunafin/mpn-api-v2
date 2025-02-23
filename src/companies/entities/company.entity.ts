import { Person } from 'src/people/entities/person.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'web', name: 'companies' })
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

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true, type: 'text' })
  instagram_url: string;

  @Column({ nullable: true, type: 'text' })
  facebook_url: string;

  @Column({ length: 100, nullable: true })
  email: string;

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
  administrator_id: number;

  @ManyToOne(() => Person, (person) => person.companies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'administrator_id' })
  administrator: Person;

  // @OneToMany(() => Quadra, (quadra) => quadra.empresa)
  // quadras: Quadra[];

  // @OneToMany(() => Imagens, (imagem) => imagem.empresa)
  // imagens: Imagens[];
}
