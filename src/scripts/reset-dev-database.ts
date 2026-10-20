/**
 * Esvazia o banco de desenvolvimento: pessoas, empresas, quadras, agendas e reservas.
 * Mantém catálogos (sport, plan, day_of_week, type_of_court), custos da plataforma,
 * o catálogo do Google e a tabela de migrations.
 *
 * Arquivos no R2 (logo e fotos) não são apagados.
 *
 * Só roda com TYPE_ENV=development e a flag --yes.
 * Usa o Postgres do .env desta API (o de dev aponta para o Railway).
 *
 *   npm run db:reset:dev -- --yes
 *
 * Para limpar e recriar admin + manager com 2 quadras:
 *   npm run db:seed:dev -- --yes
 */
import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { assertDevDatabase, wipeDevTables } from './dev-database';

async function main() {
  assertDevDatabase();
  await AppDataSource.initialize();

  try {
    const db = process.env.POSTGRES_DB;
    const host = process.env.POSTGRES_HOST;
    console.log(`Banco: ${db} em ${host}`);

    const wiped = await wipeDevTables(AppDataSource);
    if (wiped) {
      console.log('OK.');
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Falha ao limpar o banco de dev:', message);
  process.exit(1);
});
