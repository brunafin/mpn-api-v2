import { Court } from 'src/courts/entities/court.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TypeOfCourt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ enum: ['Futsal', 'Beach', 'Society'] })
  name: string;

  @Column({ length: 50 })
  description: string;

  @OneToMany(() => Court, (court) => court.type_of_court)
  courts: Court[];
}
