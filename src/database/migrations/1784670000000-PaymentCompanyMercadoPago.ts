import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentCompanyMercadoPago1784670000000
  implements MigrationInterface
{
  name = 'PaymentCompanyMercadoPago1784670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_company" ADD "mp_payment_id" character varying(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" ADD "pix_copy_paste" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" ADD "pix_qr_base64" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" ADD "pix_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_company_mp_payment_id" ON "payment_company" ("mp_payment_id") WHERE "mp_payment_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_company_mp_payment_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" DROP COLUMN "pix_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" DROP COLUMN "pix_qr_base64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" DROP COLUMN "pix_copy_paste"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_company" DROP COLUMN "mp_payment_id"`,
    );
  }
}
