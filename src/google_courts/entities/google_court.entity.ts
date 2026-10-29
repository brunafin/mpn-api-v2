import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CourtCompetitor } from '../enums/competitor.enum';
import { LostReason } from '../enums/lost-reason.enum';
import { OutreachStatus } from '../enums/outreach-status.enum';
import { PlaceKind } from '../enums/place-kind.enum';

@Entity({ schema: 'google_courts', name: 'google_court' })
export class GoogleCourt {
  @PrimaryGeneratedColumn()
  @Exclude()
  id: number;

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

  @Column({ type: 'varchar', length: 255, unique: true })
  @Expose()
  google_place_id: string;

  @Column({ type: 'varchar', length: 255 })
  @Expose()
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Expose()
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  @Expose()
  full_address: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  @Expose()
  city: string | null;

  @Column({ type: 'char', length: 2, nullable: true })
  @Expose()
  uf: string | null;

  @Column({ type: 'text', nullable: true })
  @Expose()
  website: string | null;

  @Column({ type: 'text', nullable: true })
  @Expose()
  google_maps_uri: string | null;

  @Column({ type: 'double precision', nullable: true })
  @Expose()
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  @Expose()
  longitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  @Expose()
  rating: number | null;

  @Column({ type: 'int', nullable: true })
  @Expose()
  user_ratings_total: number | null;

  @Column({ type: 'varchar', length: 32, default: CourtCompetitor.UNKNOWN })
  @Expose()
  competitor: CourtCompetitor;

  @Column({ type: 'varchar', length: 32, default: OutreachStatus.NEW })
  @Expose()
  outreach_status: OutreachStatus;

  /** Arena, sociedade, condomínio, escola ou fechou. */
  @Column({ type: 'varchar', length: 32, nullable: true })
  @Expose()
  place_kind: PlaceKind | null;

  /** Dia civil da próxima ação. Null entra na fila de hoje. */
  @Column({ type: 'date', nullable: true })
  @Expose()
  next_action_on: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  @Expose()
  lost_reason: LostReason | null;

  /** Null ainda não foi classificado e continua na fila de abordagem. */
  @Column({ type: 'boolean', nullable: true })
  @Expose()
  rents_hourly: boolean | null;

  @Column({ type: 'text', nullable: true })
  @Expose()
  notes: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  @Expose()
  contacted_at: Date | null;

  @Column({ type: 'boolean', default: false })
  @Expose()
  already_registered: boolean;

  @Column({ type: 'uuid', nullable: true })
  @Expose()
  matched_company_public_id: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  @Expose()
  dt_last_check: Date | null;
}
