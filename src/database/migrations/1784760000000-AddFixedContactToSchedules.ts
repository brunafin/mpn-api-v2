import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 1: colunas denormalizadas do fixo (additive) + backfill a partir de
 * company_customer. Não remove company_customer_id ainda.
 */
export class AddFixedContactToSchedules1784760000000
  implements MigrationInterface
{
  name = 'AddFixedContactToSchedules1784760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        ADD COLUMN IF NOT EXISTS "fixed_contact_name" character varying(50),
        ADD COLUMN IF NOT EXISTS "fixed_contact_phone" character varying(11)
    `);

    await queryRunner.query(`
      ALTER TABLE "court_schedule"
        ADD COLUMN IF NOT EXISTS "fixed_contact_name" character varying(50),
        ADD COLUMN IF NOT EXISTS "fixed_contact_phone" character varying(11)
    `);

    await queryRunner.query(`
      UPDATE court_schedule cs
      SET fixed_contact_name = TRIM(cc.name),
          fixed_contact_phone = NULLIF(TRIM(cc.phone), '')
      FROM company_customer cc
      WHERE cs.company_customer_id = cc.id
        AND cs.is_fixed = true
        AND cs.fixed_contact_name IS NULL
    `);

    await queryRunner.query(`
      UPDATE operating_schedule os
      SET fixed_contact_name = TRIM(cc.name),
          fixed_contact_phone = NULLIF(TRIM(cc.phone), '')
      FROM company_customer cc
      WHERE os.company_customer_id = cc.id
        AND os.is_fixed = true
        AND os.fixed_contact_name IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "court_schedule"
        DROP COLUMN IF EXISTS "fixed_contact_name",
        DROP COLUMN IF EXISTS "fixed_contact_phone"
    `);

    await queryRunner.query(`
      ALTER TABLE "operating_schedule"
        DROP COLUMN IF EXISTS "fixed_contact_name",
        DROP COLUMN IF EXISTS "fixed_contact_phone"
    `);
  }
}
