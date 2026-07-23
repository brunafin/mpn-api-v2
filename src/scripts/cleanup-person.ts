/**
 * Apaga uma Person e TODO o relacionado (companies, courts, agendas, reservas…).
 * Uso (em mpn-api, com .env apontando para o banco):
 *
 *   npm run cleanup:person -- <id>
 *   npm run cleanup:person -- <public_id-uuid>
 *   npm run cleanup:person -- email@exemplo.com
 *
 * Catálogos compartilhados (sport, plan, day_of_week, type_of_court) NÃO são apagados.
 * Objetos no R2 (logo) também ficam — só limpa o banco.
 */
import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';

type CountRow = { count: string };

type PersonRow = {
  id: number;
  public_id: string;
  email: string;
  name: string;
  username: string;
};

async function countQuery(
  sql: string,
  params: unknown[],
): Promise<number> {
  const rows = (await AppDataSource.query(sql, params)) as CountRow[];
  return Number(rows[0]?.count ?? 0);
}

function resolveLookup(identifier: string): {
  sql: string;
  params: unknown[];
} {
  const isNumericId = /^\d+$/.test(identifier);
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      identifier,
    );

  if (isNumericId) {
    return {
      sql: `SELECT id, public_id, email, name, username
            FROM person
            WHERE id = $1`,
      params: [Number(identifier)],
    };
  }

  if (isUuid) {
    return {
      sql: `SELECT id, public_id, email, name, username
            FROM person
            WHERE public_id = $1`,
      params: [identifier],
    };
  }

  return {
    sql: `SELECT id, public_id, email, name, username
          FROM person
          WHERE LOWER(email) = LOWER($1)`,
    params: [identifier],
  };
}

async function main() {
  const identifier = process.argv[2]?.trim();
  if (!identifier) {
    console.error(
      'Informe o id, public_id ou e-mail da person.\n' +
        '  npm run cleanup:person -- 42\n' +
        '  npm run cleanup:person -- 00000000-0000-0000-0000-000000000000\n' +
        '  npm run cleanup:person -- email@exemplo.com',
    );
    process.exit(1);
  }

  await AppDataSource.initialize();

  const lookup = resolveLookup(identifier);
  const people = (await AppDataSource.query(
    lookup.sql,
    lookup.params,
  )) as PersonRow[];

  if (people.length === 0) {
    console.error(`Nenhuma person encontrada para: ${identifier}`);
    await AppDataSource.destroy();
    process.exit(1);
  }

  if (people.length > 1) {
    console.error(
      `Mais de uma person encontrada (${people.length}). Use o public_id.`,
    );
    console.table(people);
    await AppDataSource.destroy();
    process.exit(1);
  }

  const person = people[0];
  const personId = person.id;

  const companies = (await AppDataSource.query(
    `SELECT id, public_id, name FROM company WHERE administrator_id = $1`,
    [personId],
  )) as { id: number; public_id: string; name: string }[];

  const companyIds = companies.map((c) => c.id);

  console.log('Person:', {
    id: person.id,
    public_id: person.public_id,
    email: person.email,
    name: person.name,
    username: person.username,
  });
  console.log(
    'Companies:',
    companies.length
      ? companies.map((c) => `${c.name} (${c.public_id})`).join(', ')
      : '(nenhuma)',
  );

  // Contagens prévias (só informativo).
  if (companyIds.length > 0) {
    const courtCount = await countQuery(
      `SELECT COUNT(*)::text AS count FROM court WHERE company_id = ANY($1::int[])`,
      [companyIds],
    );
    const scheduleCount = await countQuery(
      `SELECT COUNT(*)::text AS count
       FROM court_schedule cs
       JOIN court c ON c.id = cs.court_id
       WHERE c.company_id = ANY($1::int[])`,
      [companyIds],
    );
    const reservationCount = await countQuery(
      `SELECT COUNT(*)::text AS count
       FROM reservations r
       JOIN court_schedule cs ON cs.id = r.court_schedule_id
       JOIN court c ON c.id = cs.court_id
       WHERE c.company_id = ANY($1::int[])`,
      [companyIds],
    );
    console.log('Antes:', {
      courts: courtCount,
      court_schedules: scheduleCount,
      reservations: reservationCount,
    });
  }

  const qr = AppDataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const deleted: Record<string, number> = {};

    const del = async (label: string, sql: string, params: unknown[]) => {
      const result = await qr.query(sql, params);
      // pg retorna array de rows; para DELETE sem RETURNING, result é []
      // Usamos RETURNING id / * para contar.
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

    await qr.commitTransaction();
    console.log('Apagado:', deleted);
    console.log('OK.');
  } catch (error) {
    await qr.rollbackTransaction();
    throw error;
  } finally {
    await qr.release();
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Falha ao limpar:', message);
  process.exit(1);
});
