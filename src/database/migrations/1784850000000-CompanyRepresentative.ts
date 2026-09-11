import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyRepresentative1784850000000 implements MigrationInterface {
  name = 'CompanyRepresentative1784850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company"
      ADD COLUMN IF NOT EXISTS "representative" character varying(80)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company"
      DROP COLUMN IF EXISTS "representative"
    `);
  }
}
