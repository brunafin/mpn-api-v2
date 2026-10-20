/**
 * Limpeza do Postgres de desenvolvimento.
 * Mantém catálogos (sport, plan, day_of_week, type_of_court), custos da
 * plataforma, o catálogo do Google e a tabela de migrations.
 */
import { DataSource, QueryRunner } from 'typeorm';

export const KEEP_TABLES = new Set([
  'day_of_week',
  'sport',
  'type_of_court',
  'plan',
  'platform_cost',
  'migrations',
]);

export type SqlRunner = Pick<DataSource | QueryRunner, 'query'>;

type TableRow = { table_name: string };
type CountRow = { count: string };
type FkRow = { child: string; parent: string };

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function assertDevDatabase() {
  if (process.env.TYPE_ENV !== 'development') {
    console.error(
      `Recusado: TYPE_ENV precisa ser "development" (atual: ${process.env.TYPE_ENV || 'vazio'}).`,
    );
    process.exit(1);
  }

  const host = process.env.POSTGRES_HOST || '';
  const db = process.env.POSTGRES_DB || '';
  if (/prod/i.test(host) || /prod/i.test(db)) {
    console.error(
      `Recusado: host ou banco parecem de produção (${host || 'sem host'} / ${db || 'sem banco'}).`,
    );
    process.exit(1);
  }

  if (!process.argv.includes('--yes')) {
    console.error(
      'Recusado: confirme com --yes.\n' +
        '  npm run db:reset:dev -- --yes\n' +
        '  npm run db:seed:dev -- --yes',
    );
    process.exit(1);
  }
}

/** Apaga dados operacionais. Retorna false quando não há tabela para limpar. */
export async function wipeDevTables(runner: SqlRunner): Promise<boolean> {
  const tables = (await runner.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  )) as TableRow[];

  const wipe = tables
    .map((row) => row.table_name)
    .filter((name) => !KEEP_TABLES.has(name));

  if (wipe.length === 0) {
    console.log('Nada para apagar.');
    return false;
  }

  const keepList = [...KEEP_TABLES];
  const risky = (await runner.query(
    `SELECT child.relname AS child, parent.relname AS parent
     FROM pg_constraint c
     JOIN pg_class child ON child.oid = c.conrelid
     JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
     JOIN pg_class parent ON parent.oid = c.confrelid
     JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
     WHERE c.contype = 'f'
       AND child_ns.nspname = 'public'
       AND parent_ns.nspname = 'public'
       AND child.relname = ANY($1::text[])
       AND parent.relname = ANY($2::text[])`,
    [keepList, wipe],
  )) as FkRow[];

  if (risky.length > 0) {
    console.error('Recusado: um catálogo depende de tabela que seria apagada.');
    console.table(risky);
    process.exit(1);
  }

  const before: Record<string, number> = {};
  for (const name of wipe) {
    const rows = (await runner.query(
      `SELECT COUNT(*)::text AS count FROM ${quoteIdent(name)}`,
    )) as CountRow[];
    before[name] = Number(rows[0]?.count ?? 0);
  }

  console.log('Antes:', before);

  await runner.query(
    `TRUNCATE TABLE ${wipe.map(quoteIdent).join(', ')} RESTART IDENTITY CASCADE`,
  );

  console.log('Apagado. Catálogos mantidos:', [...KEEP_TABLES].join(', '));
  return true;
}
