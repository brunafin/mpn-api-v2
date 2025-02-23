import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'web', name: 'people' })
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  // @OneToMany(() => Empresa, (empresa) => empresa.administrador)
  // empresas: Empresa[];
}
