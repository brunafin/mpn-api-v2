import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bancos legados podem ter trigger de auditoria em `reservations` apontando
 * para `log.deleted_reservation`, tabela/schema que nunca entrou nas migrations
 * TypeORM. Ao excluir cliente (DELETE em reservations), o Postgres falha.
 *
 * Esta migration remove triggers (e funções) órfãos que referenciam essa relação.
 */
export class DropOrphanDeletedReservationLog1784750000000
  implements MigrationInterface
{
  name = 'DropOrphanDeletedReservationLog1784750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname AS trigger_name,
           n.nspname AS table_schema,
           c.relname AS table_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND pg_get_triggerdef(t.oid) ILIKE '%deleted_reservation%'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      r.trigger_name,
      r.table_schema,
      r.table_name
    );
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS fn_regproc
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prokind = 'f'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
      AND pg_get_functiondef(p.oid) ILIKE '%deleted_reservation%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.fn_regproc);
  END LOOP;
END $$;
`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Trigger legado não faz parte do schema versionado — sem recriação.
  }
}
