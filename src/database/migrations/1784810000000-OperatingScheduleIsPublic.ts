import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Separar existência no template (OS) de listagem no portal.
 * Default true: grade comercial / onboarding permanece pública.
 * Fix fora da grade cria OS com is_public=false (horário interno).
 */
export class OperatingScheduleIsPublic1784810000000
  implements MigrationInterface
{
  name = 'OperatingScheduleIsPublic1784810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        ADD COLUMN IF NOT EXISTS "is_public" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        DROP COLUMN IF EXISTS "is_public"
    `);
  }
}
