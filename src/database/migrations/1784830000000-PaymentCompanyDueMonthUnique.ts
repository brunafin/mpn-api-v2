import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Garante no máximo 1 parcela por empresa por mês civil de dt_due.
 * Antes do índice, duplicatas: mantém a paga (senão o menor id).
 */
export class PaymentCompanyDueMonthUnique1784830000000
  implements MigrationInterface
{
  name = 'PaymentCompanyDueMonthUnique1784830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "payment_company" AS pc
      USING (
        SELECT id
        FROM (
          SELECT
            id,
            ROW_NUMBER() OVER (
              PARTITION BY company_id, date_trunc('month', dt_due)
              ORDER BY
                CASE WHEN dt_payment IS NOT NULL THEN 0 ELSE 1 END,
                id ASC
            ) AS rn
          FROM "payment_company"
          WHERE dt_due IS NOT NULL
        ) ranked
        WHERE rn > 1
      ) dups
      WHERE pc.id = dups.id
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_payment_company_company_due_month"
      ON "payment_company" ("company_id", (date_trunc('month', "dt_due")))
      WHERE "dt_due" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_payment_company_company_due_month"`,
    );
  }
}
