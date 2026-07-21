import { buildTypeOrmOptions } from './typeorm.config';
import { entities } from './entities';

describe('buildTypeOrmOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('usa postgres e lê as variáveis de conexão do ambiente', () => {
    process.env.POSTGRES_HOST = 'db.example';
    process.env.POSTGRES_PORT = '6543';
    process.env.POSTGRES_USER = 'user';
    process.env.POSTGRES_PASSWORD = 'pass';
    process.env.POSTGRES_DB = 'mpn';

    const options = buildTypeOrmOptions();

    expect(options.type).toBe('postgres');
    expect(options).toMatchObject({
      host: 'db.example',
      port: 6543,
      username: 'user',
      password: 'pass',
      database: 'mpn',
    });
  });

  it('assume porta padrão 5432 quando POSTGRES_PORT não está definida', () => {
    delete process.env.POSTGRES_PORT;
    expect(buildTypeOrmOptions()).toMatchObject({ port: 5432 });
  });

  it('mantém synchronize e migrationsRun desligados por padrão', () => {
    delete process.env.TYPEORM_SYNCHRONIZE;
    delete process.env.TYPEORM_MIGRATIONS_RUN;

    const options = buildTypeOrmOptions();

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
  });

  it('habilita synchronize apenas com "true" ou "1"', () => {
    process.env.TYPEORM_SYNCHRONIZE = 'true';
    expect(buildTypeOrmOptions().synchronize).toBe(true);

    process.env.TYPEORM_SYNCHRONIZE = '1';
    expect(buildTypeOrmOptions().synchronize).toBe(true);

    process.env.TYPEORM_SYNCHRONIZE = 'false';
    expect(buildTypeOrmOptions().synchronize).toBe(false);

    process.env.TYPEORM_SYNCHRONIZE = 'yes';
    expect(buildTypeOrmOptions().synchronize).toBe(false);
  });

  it('registra as entidades e o glob de migrations', () => {
    const options = buildTypeOrmOptions();

    expect(options.entities).toBe(entities);
    expect(options.entities).toHaveLength(entities.length);
    expect(Array.isArray(options.migrations)).toBe(true);
    expect((options.migrations as string[])[0]).toMatch(
      /database[\\/]migrations[\\/]\*\.\{ts,js\}$/,
    );
  });
});
