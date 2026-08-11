import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * closed_by_day / CTA “reabrir dia” foram descontinuados.
 * Inativar/ativar não distingue mais origem.
 */
export class DropCourtScheduleClosedByDay1784820000000
  implements MigrationInterface
{
  name = 'DropCourtScheduleClosedByDay1784820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_court_schedule_date_closed_by_day"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" DROP COLUMN IF EXISTS "closed_by_day"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court_schedule" ADD "closed_by_day" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_court_schedule_date_closed_by_day" ON "court_schedule" ("date", "closed_by_day") `,
    );
  }
}
