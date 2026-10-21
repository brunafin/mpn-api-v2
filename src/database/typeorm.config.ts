import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { entities } from './entities';

/** Interpreta uma env booleana ("true"/"1") com fallback. */
function envFlag(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

/**
 * O boot aplica as migrations pendentes. `TYPEORM_MIGRATIONS_RUN=false`
 * desliga isso (o seed de teste faz assim e roda as migrations à parte).
 */
export function shouldRunMigrationsOnBoot(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.TYPEORM_MIGRATIONS_RUN !== 'false' && env.TYPEORM_MIGRATIONS_RUN !== '0';
}

/**
 * Opções compartilhadas do TypeORM (runtime + CLI de migrations).
 *
 * Importante:
 * - `synchronize` fica DESLIGADO por padrão. O schema passa a ser gerenciado
 *   por migrations. Só habilite via TYPEORM_SYNCHRONIZE=true em ambiente de
 *   desenvolvimento local descartável — NUNCA em produção.
 * - `migrationsRun` acompanha o boot. A Railway pode trocar o CMD da imagem;
 *   quem escuta é o processo do Nest, então é ele que aplica o schema.
 */
export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT ?? '5432', 10),
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    entities,
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: envFlag(env.TYPEORM_SYNCHRONIZE, false),
    migrationsRun: shouldRunMigrationsOnBoot(env),
  };
}
