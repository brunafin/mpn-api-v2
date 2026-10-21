/**
 * Isola o Jest e2e do .env de desenvolvimento.
 * O ConfigModule do Nest não sobrescreve variável já definida.
 */
process.env.TZ = 'America/Sao_Paulo';
process.env.TYPE_ENV = 'test';
process.env.POSTGRES_HOST = '127.0.0.1';
process.env.POSTGRES_PORT = '5433';
process.env.POSTGRES_USER = 'mpn_e2e';
process.env.POSTGRES_PASSWORD = 'mpn_e2e';
process.env.POSTGRES_DB = 'mpn_e2e';
process.env.JWT_SECRET_MANAGER_LOGIN = 'e2e-jwt-secret-not-for-prod';
process.env.DEFAULT_PASSWORD = 'Mudar@123';
process.env.TYPEORM_SYNCHRONIZE = 'false';
process.env.TYPEORM_MIGRATIONS_RUN = 'false';
process.env.EMAIL_FROM = 'e2e@mpn.dev';
