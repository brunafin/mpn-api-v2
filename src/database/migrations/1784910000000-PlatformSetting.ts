import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformSetting1784910000000 implements MigrationInterface {
  name = 'PlatformSetting1784910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_setting" (
        "id" integer NOT NULL,
        "maintenance_enabled" boolean NOT NULL DEFAULT false,
        "maintenance_message" character varying(280),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_setting" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_platform_setting_singleton" CHECK ("id" = 1)
      )
    `);
    await queryRunner.query(`
      INSERT INTO "platform_setting" ("id", "maintenance_enabled")
      VALUES (1, false)
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_setting"`);
  }
}
