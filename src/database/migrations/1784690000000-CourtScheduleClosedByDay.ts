import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marca horários fechados via "Fechar o dia", para distinguir de inativação manual.
 * Reabrir o dia só age (e só aparece) quando há closed_by_day = true.
 */
export class CourtScheduleClosedByDay1784690000000
  implements MigrationInterface
{
  name = 'CourtScheduleClosedByDay1784690000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "court_schedule" ADD "closed_by_day" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_court_schedule_date_closed_by_day" ON "court_schedule" ("date", "closed_by_day") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_court_schedule_date_closed_by_day"`,
    );
    await queryRunner.query(
      `ALTER TABLE "court_schedule" DROP COLUMN "closed_by_day"`,
    );
  }
}
