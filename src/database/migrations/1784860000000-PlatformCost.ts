import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformCost1784860000000 implements MigrationInterface {
  name = 'PlatformCost1784860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_cost" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "description" character varying(200) NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "recurrence" character varying(16) NOT NULL,
        CONSTRAINT "PK_platform_cost" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_cost"`);
  }
}
