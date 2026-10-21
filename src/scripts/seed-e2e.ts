/**
 * Seméia o Postgres de e2e (POSTGRES_DB precisa conter "e2e").
 * Rode as migrations antes. Não usa a flag --yes do seed de dev.
 */
import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { applyDevSeed } from './seed-dev';

function assertE2eDatabase() {
  const db = process.env.POSTGRES_DB || '';
  const host = process.env.POSTGRES_HOST || '';
  if (!/e2e/i.test(db)) {
    console.error(
      `Recusado: POSTGRES_DB precisa conter "e2e" (atual: ${db || 'vazio'}).`,
    );
    process.exit(1);
  }
  if (!/^(localhost|127\.0\.0\.1)$/.test(host)) {
    console.error(
      `Recusado: POSTGRES_HOST do e2e precisa ser localhost (atual: ${host || 'vazio'}).`,
    );
    process.exit(1);
  }
}

async function main() {
  assertE2eDatabase();
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    console.log(
      `Banco e2e: ${process.env.POSTGRES_DB} em ${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`,
    );
    await applyDevSeed(queryRunner);
    await queryRunner.commitTransaction();
    console.log('Seed e2e OK.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Falha no seed e2e:', message);
  process.exit(1);
});
