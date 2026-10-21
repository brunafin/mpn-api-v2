import { MigrationInterface, QueryRunner } from 'typeorm';

/** Aparência escolhida pela pessoa. Quem ainda não escolheu fica no claro. */
export class PersonColorMode1784900000000 implements MigrationInterface {
  name = 'PersonColorMode1784900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "person"
      ADD COLUMN IF NOT EXISTS "preferences_color_mode" character varying(8)
    `);
    await queryRunner.query(`
      UPDATE "person"
      SET "preferences_color_mode" = 'light'
      WHERE "preferences_color_mode" IS NULL
         OR "preferences_color_mode" NOT IN ('light', 'dark')
    `);
    await queryRunner.query(`
      ALTER TABLE "person"
      ALTER COLUMN "preferences_color_mode" SET DEFAULT 'light'
    `);
    await queryRunner.query(`
      ALTER TABLE "person"
      ALTER COLUMN "preferences_color_mode" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "person"
      DROP CONSTRAINT IF EXISTS "CHK_person_preferences_color_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "person"
      ADD CONSTRAINT "CHK_person_preferences_color_mode"
      CHECK ("preferences_color_mode" IN ('light', 'dark'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "person"
      DROP CONSTRAINT IF EXISTS "CHK_person_preferences_color_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "person" DROP COLUMN IF EXISTS "preferences_color_mode"
    `);
  }
}
