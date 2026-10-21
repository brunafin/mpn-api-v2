import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './create-e2e-app';
import { E2E_ACCOUNTS, E2E_COMPANIES } from '../src/scripts/e2e-accounts';
import { addDaysToDateKey, todayDateKey } from '../src/utils/calendarDate';

type Slot = {
  public_id: string;
  date: string;
  court_id: number;
};

async function login(
  app: INestApplication<App>,
  username: string,
  password: string,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ username, password })
    .expect(200);
  const token = response.body.access_token as string;
  if (!token) {
    throw new Error(`Login sem token para ${username}`);
  }
  return token;
}

async function freeSlot(
  dataSource: DataSource,
  slug: string,
  startHour: string,
  offsetDays: number,
): Promise<Slot> {
  const rows = (await dataSource.query(
    `SELECT cs.public_id::text AS public_id,
            to_char(cs.date, 'YYYY-MM-DD') AS date,
            cs.court_id
     FROM court_schedule cs
     JOIN court c ON c.id = cs.court_id
     JOIN company co ON co.id = c.company_id
     WHERE co.slug = $1
       AND c.name = 'Quadra 1'
       AND cs.available = true
       AND cs.is_fixed = false
       AND cs.date = $3::date
       AND cs.start_hour = $2::time
     LIMIT 1`,
    [slug, startHour, addDaysToDateKey(todayDateKey(), offsetDays)],
  )) as Slot[];
  const slot = rows[0];
  if (!slot) {
    throw new Error(
      `Horário livre ausente: ${slug} ${startHour} +${offsetDays}d`,
    );
  }
  return slot;
}

async function sportId(dataSource: DataSource, courtId: number) {
  const rows = (await dataSource.query(
    `SELECT s.id
     FROM sport s
     JOIN court_sports cs ON cs.sport_id = s.id
     WHERE cs.court_id = $1 AND s.name = 'Futsal'
     ORDER BY s.id
     LIMIT 1`,
    [courtId],
  )) as { id: number }[];
  const id = rows[0]?.id;
  if (!id) throw new Error('Futsal ausente na quadra.');
  return id;
}

describe('Agenda HTTP (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let managerToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    dataSource = app.get(DataSource);
    managerToken = await login(
      app,
      E2E_ACCOUNTS.manager.username,
      E2E_ACCOUNTS.manager.password,
    );
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  it('conflito: a segunda reserva no mesmo horário é recusada', async () => {
    const slot = await freeSlot(dataSource, E2E_COMPANIES.main.slug, '08:00', 10);
    const futsal = await sportId(dataSource, slot.court_id);
    const body = {
      contactName: 'Cliente Um',
      courtSchedulePublicId: slot.public_id,
      sportId: futsal,
    };

    await request(app.getHttpServer())
      .post('/reservation')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(body)
      .expect(201);

    const again = await request(app.getHttpServer())
      .post('/reservation')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ ...body, contactName: 'Cliente Dois' })
      .expect(400);

    expect(String(again.body.message)).toMatch(/indisponível/i);
  });

  it('fixar propaga o contato e liberar desfaz a série', async () => {
    const slot = await freeSlot(dataSource, E2E_COMPANIES.main.slug, '09:00', 11);
    const futsal = await sportId(dataSource, slot.court_id);

    await request(app.getHttpServer())
      .post('/reservation')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        contactName: 'Cliente Fixo',
        contactPhone: '51911112222',
        courtSchedulePublicId: slot.public_id,
        sportId: futsal,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/court-schedules/fix')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ court_schedule_public_id: slot.public_id })
      .expect(201);

    const fixed = (await dataSource.query(
      `SELECT COUNT(*)::int AS n
       FROM court_schedule
       WHERE court_id = $1
         AND start_hour = '09:00'::time
         AND is_fixed = true
         AND fixed_contact_name = 'Cliente Fixo'
         AND date > $2::date`,
      [slot.court_id, slot.date],
    )) as { n: number }[];
    expect(fixed[0]?.n).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/reservation/${slot.public_id}/contact`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ contactName: 'Contato Novo', contactPhone: null })
      .expect(200);

    const propagated = (await dataSource.query(
      `SELECT COUNT(*)::int AS n
       FROM reservations r
       JOIN court_schedule cs ON cs.id = r.court_schedule_id
       WHERE cs.court_id = $1
         AND cs.start_hour = '09:00'::time
         AND r.contact_name = 'Contato Novo'
         AND r.contact_phone IS NULL
         AND cs.date > $2::date`,
      [slot.court_id, slot.date],
    )) as { n: number }[];
    expect(propagated[0]?.n).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .post('/court-schedules/unfix')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ court_schedule_public_id: slot.public_id })
      .expect(201);

    const released = (await dataSource.query(
      `SELECT is_fixed
       FROM court_schedule
       WHERE public_id = $1`,
      [slot.public_id],
    )) as { is_fixed: boolean }[];
    expect(released[0]?.is_fixed).toBe(false);
  });

  it('trial encerrado bloqueia a reserva', async () => {
    const token = await login(
      app,
      E2E_ACCOUNTS.trial.username,
      E2E_ACCOUNTS.trial.password,
    );
    const slot = await freeSlot(
      dataSource,
      E2E_COMPANIES.trial.slug,
      '08:00',
      3,
    );
    const futsal = await sportId(dataSource, slot.court_id);

    const response = await request(app.getHttpServer())
      .post('/reservation')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contactName: 'Nao Deve Reservar',
        courtSchedulePublicId: slot.public_id,
        sportId: futsal,
      })
      .expect(403);

    expect(response.body.code).toBe('PRODUCT_INACTIVE');
  });

  it('somente leitura bloqueia a reserva', async () => {
    const token = await login(
      app,
      E2E_ACCOUNTS.readonly.username,
      E2E_ACCOUNTS.readonly.password,
    );
    const slot = await freeSlot(
      dataSource,
      E2E_COMPANIES.readonly.slug,
      '08:00',
      3,
    );
    const futsal = await sportId(dataSource, slot.court_id);

    const response = await request(app.getHttpServer())
      .post('/reservation')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contactName: 'Nao Deve Reservar',
        courtSchedulePublicId: slot.public_id,
        sportId: futsal,
      })
      .expect(403);

    expect(response.body.code).toBe('ACCOUNT_READ_ONLY');
  });
});
