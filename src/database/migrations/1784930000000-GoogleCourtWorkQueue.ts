import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleCourtWorkQueue1784930000000 implements MigrationInterface {
  name = 'GoogleCourtWorkQueue1784930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "place_kind" character varying(32)
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "next_action_on" date
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "lost_reason" character varying(32)
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "rents_hourly" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      DROP COLUMN IF EXISTS "rents_hourly"
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      DROP COLUMN IF EXISTS "lost_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      DROP COLUMN IF EXISTS "next_action_on"
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      DROP COLUMN IF EXISTS "place_kind"
    `);
  }
}
