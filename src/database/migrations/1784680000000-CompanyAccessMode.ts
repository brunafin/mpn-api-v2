import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separa bloqueio operacional do plano:
 * - access_mode / access_reason / access_restricted_at
 * - migra plan PENDENCE (id=3) → read_only + plano promocional
 * - remove o plano de sistema PENDENCE
 */
export class CompanyAccessMode1784680000000 implements MigrationInterface {
  name = 'CompanyAccessMode1784680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ADD "access_mode" character varying(32) NOT NULL DEFAULT 'full'`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD "access_reason" character varying(32)`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD "access_restricted_at" TIMESTAMP WITH TIME ZONE`,
    );

    // Promo comercial: qualquer plano que não seja FREE (1) nem Pendência (3).
    const promoRows: Array<{ id: number }> = await queryRunner.query(
      `SELECT id FROM plan WHERE id NOT IN (1, 3) ORDER BY id ASC LIMIT 1`,
    );
    const promoPlanId: number | null = promoRows[0]?.id ?? null;

    if (promoPlanId != null) {
      await queryRunner.query(
        `
        UPDATE "company"
        SET
          "access_mode" = 'read_only',
          "access_reason" = 'delinquency',
          "access_restricted_at" = NOW(),
          "plan_id" = $1,
          "partner_status" = 'active'
        WHERE "plan_id" = 3
        `,
        [promoPlanId],
      );
      await queryRunner.query(
        `UPDATE "payment_company" SET "plan_id" = $1 WHERE "plan_id" = 3`,
        [promoPlanId],
      );
    } else {
      // Sem plano promocional: vira expired sem plano + read_only (admin revisa).
      await queryRunner.query(`
        UPDATE "company"
        SET
          "access_mode" = 'read_only',
          "access_reason" = 'delinquency',
          "access_restricted_at" = NOW(),
          "plan_id" = NULL,
          "partner_status" = 'expired'
        WHERE "plan_id" = 3
      `);
      await queryRunner.query(
        `UPDATE "payment_company" SET "plan_id" = NULL WHERE "plan_id" = 3`,
      );
    }

    await queryRunner.query(`DELETE FROM "plan" WHERE "id" = 3`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "plan" ("id", "name", "description", "base_price", "price_per_court")
      VALUES (3, 'Pendência', 'Conta com pendência (legado)', 0, 0)
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "company"
      SET "plan_id" = 3
      WHERE "access_mode" = 'read_only'
        AND "access_reason" = 'delinquency'
    `);

    await queryRunner.query(
      `ALTER TABLE "company" DROP COLUMN "access_restricted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" DROP COLUMN "access_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" DROP COLUMN "access_mode"`,
    );
  }
}
