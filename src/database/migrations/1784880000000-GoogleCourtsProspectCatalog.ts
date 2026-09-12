import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleCourtsProspectCatalog1784880000000 implements MigrationInterface {
  name = 'GoogleCourtsProspectCatalog1784880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "google_courts"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "google_courts"."city" (
        "id" SERIAL NOT NULL,
        "ibge_id" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "state" character varying(255) NOT NULL,
        "uf" character(2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "dt_last_check" date,
        CONSTRAINT "PK_google_courts_city" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_google_courts_city_ibge" UNIQUE ("ibge_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "google_courts"."google_court" (
        "id" SERIAL NOT NULL,
        "google_place_id" character varying(255) NOT NULL,
        "name" character varying(255) NOT NULL,
        "phone" character varying(50),
        "full_address" text,
        "already_registered" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_google_courts_google_court" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_google_courts_place_id" UNIQUE ("google_place_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "city" character varying(80)
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "uf" character(2)
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "website" text
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "google_maps_uri" text
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "latitude" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "longitude" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "rating" double precision
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "user_ratings_total" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "competitor" character varying(32) NOT NULL DEFAULT 'unknown'
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "outreach_status" character varying(32) NOT NULL DEFAULT 'new'
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "notes" text
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "contacted_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "matched_company_public_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      ADD COLUMN IF NOT EXISTS "dt_last_check" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_google_court_city_uf"
      ON "google_courts"."google_court" ("city", "uf")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_google_court_outreach"
      ON "google_courts"."google_court" ("outreach_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "google_courts"."IDX_google_court_outreach"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "google_courts"."IDX_google_court_city_uf"`,
    );
    await queryRunner.query(`
      ALTER TABLE "google_courts"."google_court"
      DROP COLUMN IF EXISTS "dt_last_check",
      DROP COLUMN IF EXISTS "matched_company_public_id",
      DROP COLUMN IF EXISTS "contacted_at",
      DROP COLUMN IF EXISTS "notes",
      DROP COLUMN IF EXISTS "outreach_status",
      DROP COLUMN IF EXISTS "competitor",
      DROP COLUMN IF EXISTS "user_ratings_total",
      DROP COLUMN IF EXISTS "rating",
      DROP COLUMN IF EXISTS "longitude",
      DROP COLUMN IF EXISTS "latitude",
      DROP COLUMN IF EXISTS "google_maps_uri",
      DROP COLUMN IF EXISTS "website",
      DROP COLUMN IF EXISTS "uf",
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "updated_at",
      DROP COLUMN IF EXISTS "created_at"
    `);
  }
}
