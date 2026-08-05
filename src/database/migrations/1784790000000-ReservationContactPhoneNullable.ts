import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Telefone da reserva avulsa/fixa passa a ser opcional de verdade
 * (alinha com fixed_contact_phone e UX do manager).
 */
export class ReservationContactPhoneNullable1784790000000
  implements MigrationInterface
{
  name = 'ReservationContactPhoneNullable1784790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ALTER COLUMN "contact_phone" TYPE character varying(11)
        USING NULLIF(TRIM("contact_phone"), '')
    `);
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ALTER COLUMN "contact_phone" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "reservations"
      SET "contact_phone" = ''
      WHERE "contact_phone" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ALTER COLUMN "contact_phone" TYPE character(11)
        USING RPAD(COALESCE("contact_phone", ''), 11)
    `);
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ALTER COLUMN "contact_phone" SET NOT NULL
    `);
  }
}
