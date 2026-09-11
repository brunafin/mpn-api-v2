import { MigrationInterface, QueryRunner } from 'typeorm';

export class Representatives1784870000000 implements MigrationInterface {
  name = 'Representatives1784870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "representative_profile" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "person_id" integer NOT NULL,
        "first_month_percent" numeric(5,2) NOT NULL DEFAULT 100,
        "recurring_percent" numeric(5,2) NOT NULL DEFAULT 25,
        CONSTRAINT "PK_representative_profile" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_representative_profile_person" UNIQUE ("person_id"),
        CONSTRAINT "FK_representative_profile_person"
          FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "company"
      ADD COLUMN IF NOT EXISTS "representative_id" integer
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_company_representative'
        ) THEN
          ALTER TABLE "company"
          ADD CONSTRAINT "FK_company_representative"
          FOREIGN KEY ("representative_id") REFERENCES "person"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "company"
      DROP COLUMN IF EXISTS "representative"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "company"
      DROP CONSTRAINT IF EXISTS "FK_company_representative"
    `);
    await queryRunner.query(`
      ALTER TABLE "company"
      DROP COLUMN IF EXISTS "representative_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "company"
      ADD COLUMN IF NOT EXISTS "representative" character varying(80)
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "representative_profile"`);
  }
}
