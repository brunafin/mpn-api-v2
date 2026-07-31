import { MigrationInterface, QueryRunner } from 'typeorm';

/** Login Google: google_sub + password opcional (contas só-OAuth). */
export class PersonGoogleAuth1784740000000 implements MigrationInterface {
  name = 'PersonGoogleAuth1784740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "password" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ADD "google_sub" character varying(255)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_person_google_sub" ON "person" ("google_sub") WHERE "google_sub" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_person_google_sub"`);
    await queryRunner.query(
      `ALTER TABLE "person" DROP COLUMN "google_sub"`,
    );
    await queryRunner.query(
      `ALTER TABLE "person" ALTER COLUMN "password" SET NOT NULL`,
    );
  }
}
