import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove flag de prepago — produto não usa mais (status = reserved).
 */
export class DropReservationIsPrepaid1784800000000
  implements MigrationInterface
{
  name = 'DropReservationIsPrepaid1784800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
        DROP COLUMN IF EXISTS "is_prepaid"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD COLUMN "is_prepaid" boolean NOT NULL DEFAULT false
    `);
  }
}
