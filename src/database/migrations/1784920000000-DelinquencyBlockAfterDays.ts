import { MigrationInterface, QueryRunner } from 'typeorm';

export class DelinquencyBlockAfterDays1784920000000
  implements MigrationInterface
{
  name = 'DelinquencyBlockAfterDays1784920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_setting"
      ADD COLUMN IF NOT EXISTS "delinquency_block_after_days" integer NOT NULL DEFAULT 10
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_setting"
      DROP COLUMN IF EXISTS "delinquency_block_after_days"
    `);
  }
}
