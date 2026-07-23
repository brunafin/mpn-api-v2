import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerification1784597965106 implements MigrationInterface {
  name = 'EmailVerification1784597965106';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_verification" ("id" SERIAL NOT NULL, "email" character varying(100) NOT NULL, "code" character(6) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP, "person_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b985a8362d9dac51e3d6120d40e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ffc9210f041753e837b29d9e5" ON "email_verification" ("email") `,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_562e8455814b0f459d63a408ff7" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_verification" DROP CONSTRAINT "FK_562e8455814b0f459d63a408ff7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ffc9210f041753e837b29d9e5"`,
    );
    await queryRunner.query(`DROP TABLE "email_verification"`);
  }
}
