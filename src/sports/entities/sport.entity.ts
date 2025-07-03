import { Column, Entity, JoinTable, OneToMany, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Court } from 'src/courts/entities/court.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';

@Entity({ name: 'sport' })
export class Sport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  name: string;

  @Column({ type: 'boolean', default: false })
  needsNet: boolean;

  @OneToMany(() => Reservation, (reservartion) => reservartion.sport)
  reservations: Reservation[];

  @ManyToMany(() => Court, (court) => court.court_sports)
  @JoinTable({
    name: 'court_sports',
    joinColumn: {
      name: 'sport_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'court_id',
      referencedColumnName: 'id',
    },
  })
  courts: Court[];
}
