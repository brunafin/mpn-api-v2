import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyFirstAccessAndExpired1784660000000
  implements MigrationInterface
{
  name = 'CompanyFirstAccessAndExpired1784660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ADD "first_access_at" TIMESTAMP WITH TIME ZONE`,
    );

    // Trials já vencidos (plano gratuito): marcar expirado e desvincular plano.
    await queryRunner.query(`
      UPDATE "company"
      SET
        "partner_status" = 'expired',
        "plan_id" = NULL
      WHERE "trial_ends_at" IS NOT NULL
        AND "trial_ends_at" <= NOW()
        AND "partner_status" = 'active'
        AND ("plan_id" IS NULL OR "plan_id" = 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" DROP COLUMN "first_access_at"`,
    );
  }
}
