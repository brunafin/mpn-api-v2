import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - is_trial: fonte da verdade para "está em trial agora"
 * - trial_ends_at: histórico (quando acaba / quando acabou), nunca null
 */
export class CompanyIsTrialAndTrialEndsAtNotNull1784710000000
  implements MigrationInterface
{
  name = 'CompanyIsTrialAndTrialEndsAtNotNull1784710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company"
      ADD COLUMN IF NOT EXISTS "is_trial" boolean NOT NULL DEFAULT false
    `);

    // Backfill de datas nulas (legado / conversão antiga que limpava a coluna).
    await queryRunner.query(`
      UPDATE "company"
      SET "trial_ends_at" = COALESCE(
        "trial_ends_at",
        "first_access_at" + INTERVAL '3 months',
        "first_access_at",
        "created_at",
        NOW()
      )
      WHERE "trial_ends_at" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "company"
      ALTER COLUMN "trial_ends_at" SET NOT NULL
    `);

    // Trial ativo = FREE (id 1) + partner active + data ainda no futuro.
    await queryRunner.query(`
      UPDATE "company"
      SET "is_trial" = true
      WHERE "partner_status" = 'active'
        AND "plan_id" = 1
        AND "trial_ends_at" > NOW()
    `);

    // Demais ficam false (já é o default).
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company"
      ALTER COLUMN "trial_ends_at" DROP NOT NULL
    `);

    // Quem não está em trial volta a null (semântica antiga).
    await queryRunner.query(`
      UPDATE "company"
      SET "trial_ends_at" = NULL
      WHERE "is_trial" = false
    `);

    await queryRunner.query(`
      ALTER TABLE "company"
      DROP COLUMN IF EXISTS "is_trial"
    `);
  }
}
