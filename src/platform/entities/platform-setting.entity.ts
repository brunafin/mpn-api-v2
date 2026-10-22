import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Uma única linha (id = 1) com o estado operacional da plataforma. */
@Entity({ name: 'platform_setting' })
export class PlatformSetting {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'boolean', default: false })
  maintenance_enabled: boolean;

  @Column({ type: 'varchar', length: 280, nullable: true })
  maintenance_message: string | null;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
