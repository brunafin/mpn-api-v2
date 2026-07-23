import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyPartnerStatus1784640000000 implements MigrationInterface {
  name = 'CompanyPartnerStatus1784640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ADD "partner_status" character varying(32) NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD "trial_ends_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "trial_ends_at"`);
    await queryRunner.query(
      `ALTER TABLE "company" DROP COLUMN "partner_status"`,
    );
  }
}
