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
import {
  cleanupPersonById,
  countPersonRelated,
  type CleanupPersonRow,
} from '../people/cleanup-person';

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

  try {
    const lookup = resolveLookup(identifier);
    const people = (await AppDataSource.query(
      lookup.sql,
      lookup.params,
    )) as CleanupPersonRow[];

    if (people.length === 0) {
      console.error(`Nenhuma person encontrada para: ${identifier}`);
      process.exit(1);
    }

    if (people.length > 1) {
      console.error(
        `Mais de uma person encontrada (${people.length}). Use o public_id.`,
      );
      console.table(people);
      process.exit(1);
    }

    const person = people[0];
    const companies = (await AppDataSource.query(
      `SELECT id, public_id, name FROM company WHERE administrator_id = $1`,
      [person.id],
    )) as { id: number; public_id: string; name: string }[];

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

    const companyIds = companies.map((c) => c.id);
    if (companyIds.length > 0) {
      const before = await countPersonRelated(AppDataSource, companyIds);
      console.log('Antes:', before);
    }

    const result = await cleanupPersonById(AppDataSource, person.id);
    console.log('Apagado:', result.deleted);
    console.log('OK.');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Falha ao limpar:', message);
  process.exit(1);
});
