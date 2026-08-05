import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove token legado de cancelamento público por link (fluxo removido).
 * Cancelamento de reserva é só autenticado no manager.
 */
export class DropReservationTokenToCancel1784780000000
  implements MigrationInterface
{
  name = 'DropReservationTokenToCancel1784780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
        DROP COLUMN IF EXISTS "token_to_cancel"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservations"
        ADD COLUMN "token_to_cancel" text
    `);
  }
}
