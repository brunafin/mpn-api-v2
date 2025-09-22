import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'google_courts', name: 'city' })
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  ibge_id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  state: string;

  @Column({ type: 'char', length: 2 })
  uf: string;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  @Column({ type: 'date', nullable: true })
  dt_last_check: Date;
}
