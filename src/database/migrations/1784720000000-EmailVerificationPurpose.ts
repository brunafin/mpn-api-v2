import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerificationPurpose1784720000000
  implements MigrationInterface
{
  name = 'EmailVerificationPurpose1784720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD "purpose" character varying(32) NOT NULL DEFAULT 'email_verification'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_verification_purpose" ON "email_verification" ("purpose")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_email_verification_purpose"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" DROP COLUMN "purpose"`,
    );
  }
}
