import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 5: remove ponteiro company_customer do template/slot e a tabela.
 * Requer backfill de fixed_contact_* (migration anterior) e código só nas
 * colunas novas.
 */
export class DropCompanyCustomer1784770000000 implements MigrationInterface {
  name = 'DropCompanyCustomer1784770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        DROP CONSTRAINT IF EXISTS "FK_81d096d802d292d1725710892e4"
    `);
    await queryRunner.query(`
      ALTER TABLE "court_schedule"
        DROP CONSTRAINT IF EXISTS "FK_24cff6b39c604fc27787de50d07"
    `);

    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        DROP COLUMN IF EXISTS "company_customer_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "court_schedule"
        DROP COLUMN IF EXISTS "company_customer_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "company_customer"
        DROP CONSTRAINT IF EXISTS "FK_f88f3fddda9891bcaebad6b821f"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_customer"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "company_customer" (
        "id" SERIAL NOT NULL,
        "name" character varying(50) NOT NULL,
        "phone" character(11) NOT NULL,
        "email" character varying(100),
        "company_id" integer NOT NULL,
        CONSTRAINT "UQ_e661c0832c4a6512cbe1ca4a3ca" UNIQUE ("name", "phone", "company_id"),
        CONSTRAINT "PK_4f8b4c49d336c1091ffd429a059" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "company_customer"
        ADD CONSTRAINT "FK_f88f3fddda9891bcaebad6b821f"
        FOREIGN KEY ("company_id") REFERENCES "company"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        ADD COLUMN "company_customer_id" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "court_schedule"
        ADD COLUMN "company_customer_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        ADD CONSTRAINT "FK_81d096d802d292d1725710892e4"
        FOREIGN KEY ("company_customer_id") REFERENCES "company_customer"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "court_schedule"
        ADD CONSTRAINT "FK_24cff6b39c604fc27787de50d07"
        FOREIGN KEY ("company_customer_id") REFERENCES "company_customer"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }
}
