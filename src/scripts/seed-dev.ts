/**
 * Limpa o banco de desenvolvimento e cria:
 * - admin da plataforma (mpn-admin): usuário mpn / senha Admin@123
 * - dono de arena (mpn-manager): usuário manager / senha Admin@123
 *   com a arena "Arena Dev" e duas quadras já publicadas,
 *   grade 08:00–22:00 em todos os dias e agenda dos próximos 90 dias.
 *
 * Catálogos (dias, esportes, tipos de quadra, planos) são recriados se faltarem.
 * Arquivos no R2 não são apagados.
 *
 * Só roda com TYPE_ENV=development e a flag --yes.
 *
 *   npm run db:seed:dev -- --yes
 */
import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../database/data-source';
import { addDaysToDateKey, todayDateKey } from '../utils/calendarDate';
import {
  assertDevDatabase,
  wipeDevTables,
  type SqlRunner,
} from './dev-database';

const ADMIN = {
  name: 'Admin MPN',
  username: 'mpn',
  email: 'mpn@mpn.dev',
  phone: '51999990000',
  password: 'Admin@123',
  role: 'platform_admin',
};

const MANAGER = {
  name: 'Gestor Arena',
  username: 'manager',
  email: 'manager@mpn.dev',
  phone: '51999990001',
  password: 'Admin@123',
  role: 'owner',
};

const COMPANY = {
  name: 'Arena Dev',
  slug: 'arena-dev',
  phone: '51999990002',
  email: 'arena@mpn.dev',
  cep: '90010-000',
  street: 'Rua da Praia',
  number: '100',
  neighborhood: 'Centro Histórico',
  city: 'Porto Alegre',
  uf: 'RS',
};

const COURTS = [
  {
    name: 'Quadra 1',
    floor: 'grama_sintetica',
    isCovered: true,
    canHaveNet: false,
    typeName: 'Society',
    sports: ['Futsal', 'Fut7'],
    price: 120,
  },
  {
    name: 'Quadra 2',
    floor: 'areia',
    isCovered: false,
    canHaveNet: true,
    typeName: 'Areia',
    sports: ['Beach Tennis'],
    price: 100,
  },
] as const;

const AGENDA_DAYS = 90;

const DAYS = [
  { abbreviation: 'DOM', description: 'Domingo', ref: 0 },
  { abbreviation: 'SEG', description: 'Segunda-feira', ref: 1 },
  { abbreviation: 'TER', description: 'Terça-feira', ref: 2 },
  { abbreviation: 'QUA', description: 'Quarta-feira', ref: 3 },
  { abbreviation: 'QUI', description: 'Quinta-feira', ref: 4 },
  { abbreviation: 'SEX', description: 'Sexta-feira', ref: 5 },
  { abbreviation: 'SAB', description: 'Sábado', ref: 6 },
];

const SPORTS = [
  { name: 'Futsal', needsNet: false },
  { name: 'Fut5', needsNet: false },
  { name: 'Fut6', needsNet: false },
  { name: 'Fut7', needsNet: false },
  { name: 'Futebol de campo 11', needsNet: false },
  { name: 'Futevôlei', needsNet: true },
  { name: 'Vôlei de quadra', needsNet: true },
  { name: 'Vôlei de areia', needsNet: true },
  { name: 'Beach Tennis', needsNet: true },
  { name: 'Tênis', needsNet: true },
  { name: 'Padel', needsNet: true },
  { name: 'Pickleball', needsNet: true },
  { name: 'Basquete', needsNet: false },
];

const COURT_TYPES = [
  { name: 'Futsal', description: 'Quadra de futsal' },
  { name: 'Society', description: 'Quadra society' },
  { name: 'Areia', description: 'Quadra de areia' },
];

type IdRow = { id: number };
type PersonRow = { id: number; username: string };
type CourtRow = { id: number; name: string };

async function ensureCatalogs(runner: SqlRunner) {
  for (const day of DAYS) {
    await runner.query(
      `INSERT INTO day_of_week (abbreviation, description, ref)
       SELECT $1::varchar, $2::varchar, $3::int
       WHERE NOT EXISTS (SELECT 1 FROM day_of_week WHERE ref = $3::int)`,
      [day.abbreviation, day.description, day.ref],
    );
  }

  await runner.query(
    `UPDATE sport SET name = 'Fut7'
     WHERE name = 'Fut7 (Society)'
       AND NOT EXISTS (SELECT 1 FROM sport WHERE name = 'Fut7')`,
  );

  for (const sport of SPORTS) {
    await runner.query(
      `INSERT INTO sport (name, "needsNet")
       SELECT $1::varchar, $2::boolean
       WHERE NOT EXISTS (SELECT 1 FROM sport WHERE name = $1::varchar)`,
      [sport.name, sport.needsNet],
    );
  }

  for (const type of COURT_TYPES) {
    await runner.query(
      `INSERT INTO type_of_court (name, description)
       SELECT $1::varchar, $2::varchar
       WHERE NOT EXISTS (SELECT 1 FROM type_of_court WHERE name = $1::varchar)`,
      [type.name, type.description],
    );
  }

  await runner.query(
    `INSERT INTO plan (id, name, description, base_price, price_per_court)
     VALUES (1, 'Gratuito (Teste)', 'Plano gratuito de teste', 0, 0)
     ON CONFLICT (id) DO NOTHING`,
  );
  await runner.query(
    `INSERT INTO plan (id, name, description, base_price, price_per_court)
     VALUES (2, 'Promocional', 'Plano comercial promocional', 100, 10)
     ON CONFLICT (id) DO NOTHING`,
  );
  await runner.query(
    `SELECT setval(
       pg_get_serial_sequence('plan', 'id'),
       GREATEST((SELECT MAX(id) FROM plan), 1)
     )`,
  );
}

async function insertPerson(
  runner: SqlRunner,
  person: {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  },
): Promise<PersonRow> {
  const passwordHash = await bcrypt.hash(person.password, 10);
  const rows = (await runner.query(
    `INSERT INTO person (
       name, phone, email, status, username, role, password, terms_accepted_at
     )
     VALUES ($1, $2, $3, true, $4, $5, $6, NOW())
     RETURNING id, username`,
    [
      person.name,
      person.phone,
      person.email,
      person.username,
      person.role,
      passwordHash,
    ],
  )) as PersonRow[];

  const created = rows[0];
  if (!created) {
    throw new Error(`Não foi possível criar o usuário ${person.username}.`);
  }
  return created;
}

async function sportIds(runner: SqlRunner, names: readonly string[]) {
  const rows = (await runner.query(
    `SELECT DISTINCT ON (name) id, name
     FROM sport
     WHERE name = ANY($1::text[])
     ORDER BY name, id`,
    [names],
  )) as { id: number; name: string }[];

  const byName = new Map(rows.map((row) => [row.name, row.id]));
  const missing = names.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(`Esportes ausentes no catálogo: ${missing.join(', ')}.`);
  }
  return names.map((name) => byName.get(name)!);
}

async function typeId(runner: SqlRunner, name: string): Promise<number | null> {
  const rows = (await runner.query(
    `SELECT id FROM type_of_court WHERE name = $1 ORDER BY id LIMIT 1`,
    [name],
  )) as IdRow[];
  return rows[0]?.id ?? null;
}

async function seedArena(runner: SqlRunner, administratorId: number) {
  const companies = (await runner.query(
    `INSERT INTO company (
       name, phone, email, slug, cep, street, number, neighborhood, city, uf,
       administrator_id, plan_id, is_active, partner_status, is_trial,
       trial_ends_at, first_access_at, access_mode
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, 1, true, 'active', true,
       NOW() + INTERVAL '2 months', NOW(), 'full'
     )
     RETURNING id`,
    [
      COMPANY.name,
      COMPANY.phone,
      COMPANY.email,
      COMPANY.slug,
      COMPANY.cep,
      COMPANY.street,
      COMPANY.number,
      COMPANY.neighborhood,
      COMPANY.city,
      COMPANY.uf,
      administratorId,
    ],
  )) as IdRow[];

  const companyId = companies[0]?.id;
  if (!companyId) {
    throw new Error('Não foi possível criar a arena.');
  }

  const courtIds: number[] = [];
  for (const court of COURTS) {
    const created = (await runner.query(
      `INSERT INTO court (
         name, company_id, type_of_court_id, show, floor, is_covered, is_can_have_net
       )
       VALUES ($1, $2, $3, true, $4, $5, $6)
       RETURNING id, name`,
      [
        court.name,
        companyId,
        await typeId(runner, court.typeName),
        court.floor,
        court.isCovered,
        court.canHaveNet,
      ],
    )) as CourtRow[];

    const courtId = created[0]?.id;
    if (!courtId) {
      throw new Error(`Não foi possível criar ${court.name}.`);
    }
    courtIds.push(courtId);

    const sports = await sportIds(runner, court.sports);
    for (const sportId of sports) {
      await runner.query(
        `INSERT INTO court_sports (court_id, sport_id) VALUES ($1, $2)`,
        [courtId, sportId],
      );
    }

    await runner.query(
      `INSERT INTO operating_schedule (
         hour, price, is_fixed, day_of_week_id, court_id, is_active, is_public
       )
       SELECT
         (TIME '08:00' + (slot.hour_index * INTERVAL '1 hour'))::time,
         $1::numeric,
         false,
         day.id,
         $2::int,
         true,
         true
       FROM generate_series(0, 13) AS slot(hour_index)
       CROSS JOIN (
         SELECT DISTINCT ON (ref) id
         FROM day_of_week
         ORDER BY ref, id
       ) AS day`,
      [court.price, courtId],
    );
  }

  const start = todayDateKey();
  const end = addDaysToDateKey(start, AGENDA_DAYS - 1);
  await runner.query(
    `INSERT INTO court_schedule (
       start_hour, end_hour, date, available, price, court_id, day_of_week_id, is_fixed
     )
     SELECT
       os.hour,
       (os.hour + INTERVAL '1 hour')::time,
       gs.day::date,
       true,
       os.price,
       os.court_id,
       os.day_of_week_id,
       false
     FROM operating_schedule os
     JOIN day_of_week dow ON dow.id = os.day_of_week_id
     CROSS JOIN generate_series($1::date, $2::date, INTERVAL '1 day') AS gs(day)
     WHERE EXTRACT(DOW FROM gs.day)::int = dow.ref
       AND os.court_id = ANY($3::int[])`,
    [start, end, courtIds],
  );

  return { start, end };
}

export async function applyDevSeed(runner: SqlRunner) {
  await wipeDevTables(runner);
  await ensureCatalogs(runner);

  const admin = await insertPerson(runner, ADMIN);
  const manager = await insertPerson(runner, MANAGER);
  const agenda = await seedArena(runner, manager.id);

  return { admin, manager, agenda };
}

async function main() {
  assertDevDatabase();
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const db = process.env.POSTGRES_DB;
    const host = process.env.POSTGRES_HOST;
    console.log(`Banco: ${db} em ${host}`);

    const { admin, manager, agenda } = await applyDevSeed(queryRunner);

    await queryRunner.commitTransaction();

    console.log('Seed criado.');
    console.log('Admin (mpn-admin):');
    console.log(`  usuário: ${admin.username}`);
    console.log(`  senha:   ${ADMIN.password}`);
    console.log('Manager (mpn-manager):');
    console.log(`  usuário: ${manager.username}`);
    console.log(`  senha:   ${MANAGER.password}`);
    console.log(`  arena:   ${COMPANY.name} (${COMPANY.slug})`);
    console.log(`  quadras: ${COURTS.map((court) => court.name).join(', ')}`);
    console.log(`  agenda:  ${agenda.start} a ${agenda.end}, 08:00–22:00`);
    console.log('OK.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Falha ao limpar e semear o banco de dev:', message);
    process.exit(1);
  });
}
