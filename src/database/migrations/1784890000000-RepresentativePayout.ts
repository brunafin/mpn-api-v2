import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepresentativePayout1784890000000 implements MigrationInterface {
  name = 'RepresentativePayout1784890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "representative_payout" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "person_id" integer NOT NULL,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "paid_at" date NOT NULL,
        CONSTRAINT "PK_representative_payout" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_representative_payout_month" UNIQUE ("person_id", "year", "month"),
        CONSTRAINT "FK_representative_payout_person"
          FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_representative_payout_month"
          CHECK ("month" >= 1 AND "month" <= 12)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "representative_payout"`);
  }
}
