import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanPricingFormula1784650000000 implements MigrationInterface {
  name = 'PlanPricingFormula1784650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan" RENAME COLUMN "price" TO "base_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" ADD "price_per_court" numeric(10,2) NOT NULL DEFAULT 0`,
    );
    // Plano BASIC (pago): R$ 100 + R$ 10/quadra
    await queryRunner.query(
      `UPDATE "plan" SET "base_price" = 100, "price_per_court" = 10 WHERE "id" = 2`,
    );
    await queryRunner.query(
      `UPDATE "plan" SET "price_per_court" = 0 WHERE "id" IN (1, 3)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan" DROP COLUMN "price_per_court"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" RENAME COLUMN "base_price" TO "price"`,
    );
  }
}
