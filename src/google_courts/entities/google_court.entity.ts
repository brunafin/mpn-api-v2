import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'google_courts', name: 'google_court' })
export class GoogleCourt {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Expose()
  google_place_id: string;

  @Column({ type: 'varchar', length: 255 })
  @Expose()
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Expose()
  phone: string;

  @Column({ type: 'text', nullable: true })
  @Expose()
  full_address: string;

  @Column({ type: 'boolean', default: false })
  @Expose()
  already_registered: boolean;
}
