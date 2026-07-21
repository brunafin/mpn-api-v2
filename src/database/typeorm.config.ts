import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { entities } from './entities';

/** Interpreta uma env booleana ("true"/"1") com fallback. */
function envFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

/**
 * Opções compartilhadas do TypeORM (runtime + CLI de migrations).
 *
 * Importante:
 * - `synchronize` fica DESLIGADO por padrão. O schema passa a ser gerenciado
 *   por migrations. Só habilite via TYPEORM_SYNCHRONIZE=true em ambiente de
 *   desenvolvimento local descartável — NUNCA em produção.
 * - `migrationsRun` só roda migrations no boot quando TYPEORM_MIGRATIONS_RUN=true.
 */
export function buildTypeOrmOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: envFlag(process.env.TYPEORM_SYNCHRONIZE, false),
    migrationsRun: envFlag(process.env.TYPEORM_MIGRATIONS_RUN, false),
  };
}
