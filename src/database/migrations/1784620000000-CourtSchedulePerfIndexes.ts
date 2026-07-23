import { MigrationInterface, QueryRunner } from 'typeorm';

export class CourtSchedulePerfIndexes1784620000000
  implements MigrationInterface
{
  name = 'CourtSchedulePerfIndexes1784620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_court_schedule_date_available" ON "court_schedule" ("date", "available")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_court_schedule_court_id_date" ON "court_schedule" ("court_id", "date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_court_schedule_court_id_date"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_court_schedule_date_available"`,
    );
  }
}
