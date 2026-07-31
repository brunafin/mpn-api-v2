import { DataSource, QueryRunner } from 'typeorm';

export type CleanupPersonRow = {
  id: number;
  public_id: string;
  email: string;
  name: string;
  username: string;
  role?: string;
};

export type CleanupCompanyRow = {
  id: number;
  public_id: string;
  name: string;
};

export type CleanupPersonResult = {
  person: CleanupPersonRow;
  companies: CleanupCompanyRow[];
  deleted: Record<string, number>;
};

type CountRow = { count: string };

/**
 * Apaga uma Person e TODO o relacionado (companies, courts, agendas, reservas…).
 * Catálogos compartilhados (sport, plan, day_of_week, type_of_court) NÃO são apagados.
 * Objetos no R2 (logo) também ficam — só limpa o banco.
 */
export async function cleanupPersonById(
  dataSource: DataSource,
  personId: number,
): Promise<CleanupPersonResult> {
  const people = (await dataSource.query(
    `SELECT id, public_id, email, name, username, role
     FROM person
     WHERE id = $1`,
    [personId],
  )) as CleanupPersonRow[];

  if (people.length === 0) {
    throw new Error(`Person id=${personId} não encontrada.`);
  }

  const person = people[0];
  const companies = (await dataSource.query(
    `SELECT id, public_id, name FROM company WHERE administrator_id = $1`,
    [personId],
  )) as CleanupCompanyRow[];

  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const deleted = await runCascadeDeletes(qr, personId, companies);
    await qr.commitTransaction();
    return { person, companies, deleted };
  } catch (error) {
    await qr.rollbackTransaction();
    throw error;
  } finally {
    await qr.release();
  }
}

export async function countPersonRelated(
  dataSource: DataSource,
  companyIds: number[],
): Promise<{
  courts: number;
  court_schedules: number;
  reservations: number;
}> {
  if (companyIds.length === 0) {
    return { courts: 0, court_schedules: 0, reservations: 0 };
  }

  const courts = await countQuery(
    dataSource,
    `SELECT COUNT(*)::text AS count FROM court WHERE company_id = ANY($1::int[])`,
    [companyIds],
  );
  const court_schedules = await countQuery(
    dataSource,
    `SELECT COUNT(*)::text AS count
     FROM court_schedule cs
     JOIN court c ON c.id = cs.court_id
     WHERE c.company_id = ANY($1::int[])`,
    [companyIds],
  );
  const reservations = await countQuery(
    dataSource,
    `SELECT COUNT(*)::text AS count
     FROM reservations r
     JOIN court_schedule cs ON cs.id = r.court_schedule_id
     JOIN court c ON c.id = cs.court_id
     WHERE c.company_id = ANY($1::int[])`,
    [companyIds],
  );

  return { courts, court_schedules, reservations };
}

async function countQuery(
  dataSource: DataSource,
  sql: string,
  params: unknown[],
): Promise<number> {
  const rows = (await dataSource.query(sql, params)) as CountRow[];
  return Number(rows[0]?.count ?? 0);
}

async function runCascadeDeletes(
  qr: QueryRunner,
  personId: number,
  companies: CleanupCompanyRow[],
): Promise<Record<string, number>> {
  const deleted: Record<string, number> = {};
  const companyIds = companies.map((c) => c.id);

  const del = async (label: string, sql: string, params: unknown[]) => {
    const result = await qr.query(sql, params);
    deleted[label] = Array.isArray(result) ? result.length : 0;
  };

  if (companyIds.length > 0) {
    await del(
      'reservations',
      `DELETE FROM reservations
       WHERE court_schedule_id IN (
         SELECT cs.id
         FROM court_schedule cs
         JOIN court c ON c.id = cs.court_id
         WHERE c.company_id = ANY($1::int[])
       )
       RETURNING id`,
      [companyIds],
    );

    await del(
      'court_schedule',
      `DELETE FROM court_schedule
       WHERE court_id IN (
         SELECT id FROM court WHERE company_id = ANY($1::int[])
       )
       RETURNING id`,
      [companyIds],
    );

    await del(
      'operating_schedule',
      `DELETE FROM operating_schedule
       WHERE court_id IN (
         SELECT id FROM court WHERE company_id = ANY($1::int[])
       )
       RETURNING court_id`,
      [companyIds],
    );

    await del(
      'court_sports',
      `DELETE FROM court_sports
       WHERE court_id IN (
         SELECT id FROM court WHERE company_id = ANY($1::int[])
       )
       RETURNING court_id`,
      [companyIds],
    );

    await del(
      'court',
      `DELETE FROM court WHERE company_id = ANY($1::int[]) RETURNING id`,
      [companyIds],
    );

    await del(
      'notes',
      `DELETE FROM notes WHERE company_id = ANY($1::int[]) RETURNING id`,
      [companyIds],
    );

    await del(
      'payment_company',
      `DELETE FROM payment_company
       WHERE company_id = ANY($1::int[])
       RETURNING id`,
      [companyIds],
    );

    await del(
      'company_image',
      `DELETE FROM company_image
       WHERE company_id = ANY($1::int[])
       RETURNING id`,
      [companyIds],
    );

    await del(
      'company_customer',
      `DELETE FROM company_customer
       WHERE company_id = ANY($1::int[])
       RETURNING id`,
      [companyIds],
    );

    await del(
      'company',
      `DELETE FROM company WHERE id = ANY($1::int[]) RETURNING id`,
      [companyIds],
    );
  }

  await del(
    'email_verification',
    `DELETE FROM email_verification WHERE person_id = $1 RETURNING id`,
    [personId],
  );

  await del(
    'person',
    `DELETE FROM person WHERE id = $1 RETURNING id`,
    [personId],
  );

  return deleted;
}
