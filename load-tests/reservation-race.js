/**
 * Race de reserva — N VUs batem no MESMO horário ao mesmo tempo
 *
 * Valida o SELECT … FOR UPDATE: só 1 deve criar a reserva (201/200);
 * o resto deve falhar com 400 (horário indisponível).
 *
 * ATENÇÃO: altera dados reais. Use só em ambiente de DEV/staging.
 *
 * Uso:
 *   k6 run load-tests/reservation-race.js \
 *     -e BASE_URL=http://localhost:3001 \
 *     -e MANAGER_USER=user -e MANAGER_PASS=secret \
 *     -e SPORT_ID=1 \
 *     -e VUS=10
 *
 * Opcional: -e SCHEDULE_PUBLIC_ID=<uuid> (senão pega o 1º available da agenda)
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import {
  authHeaders,
  decodeJwtPayload,
  jsonHeaders,
  todayPlusDays,
} from "./lib.js";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const MANAGER_USER = __ENV.MANAGER_USER || "";
const MANAGER_PASS = __ENV.MANAGER_PASS || "";
const SPORT_ID = Number(__ENV.SPORT_ID || 1);
const DATE = __ENV.DATE || todayPlusDays(1);
const VUS = Number(__ENV.VUS || 10);

const created = new Counter("reservations_created");
const conflict = new Counter("reservations_conflict");
const otherFail = new Counter("reservations_other_fail");

export const options = {
  scenarios: {
    race: {
      executor: "shared-iterations",
      vus: VUS,
      iterations: VUS,
      maxDuration: "30s",
    },
  },
  thresholds: {
    // Exatamente 1 sucesso esperado no mesmo slot
    reservations_created: ["count==1"],
    // Os demais devem ser conflito (indisponível / unique)
    reservations_conflict: [`count==${VUS - 1}`],
  },
};

export function setup() {
  if (!MANAGER_USER || !MANAGER_PASS) {
    throw new Error("Defina MANAGER_USER e MANAGER_PASS");
  }

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      username: MANAGER_USER,
      password: MANAGER_PASS,
    }),
    { headers: jsonHeaders() },
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status} ${loginRes.body}`);
  }

  const token = loginRes.json("access_token");
  const payload = decodeJwtPayload(token);
  const companyPublicId =
    __ENV.COMPANY_PUBLIC_ID || payload.companyPublicId || null;

  if (!companyPublicId) {
    throw new Error("companyPublicId ausente — passe COMPANY_PUBLIC_ID");
  }

  let schedulePublicId = __ENV.SCHEDULE_PUBLIC_ID || "";

  if (!schedulePublicId) {
    const agenda = http.get(
      `${BASE_URL}/companies/${companyPublicId}/schedules/${DATE}`,
      { headers: authHeaders(token) },
    );
    if (agenda.status !== 200) {
      throw new Error(`Agenda falhou: ${agenda.status} ${agenda.body}`);
    }
    const slots = agenda.json();
    const available = (slots || []).find((s) => s.status === "available");
    if (!available) {
      throw new Error(
        `Nenhum horário available em ${DATE}. Passe SCHEDULE_PUBLIC_ID ou outra DATE.`,
      );
    }
    schedulePublicId = available.scheduleId;
    console.log(`[k6] slot alvo: ${schedulePublicId} (${available.time})`);
  }

  // Barreira simples: todos os VUs começam juntos após setup
  return { token, schedulePublicId, companyPublicId };
}

export default function (data) {
  // Pequeno jitter zero — shared-iterations já dispara junto
  sleep(0.01 * Math.random());

  const res = http.post(
    `${BASE_URL}/reservation`,
    JSON.stringify({
      contactName: `k6-race-${__VU}`,
      contactPhone: "51999999999",
      courtSchedulePublicId: data.schedulePublicId,
      sportId: SPORT_ID,
      observation: "load-test reservation-race",
    }),
    {
      headers: authHeaders(data.token),
      tags: { name: "reservation_create" },
    },
  );

  if (res.status === 200 || res.status === 201) {
    created.add(1);
    check(res, { "reserva criada": () => true });
    return;
  }

  if (res.status === 400) {
    conflict.add(1);
    check(res, { "conflito esperado (400)": () => true });
    return;
  }

  otherFail.add(1);
  console.error(`[k6] VU ${__VU} status inesperado: ${res.status} ${res.body}`);
  check(res, { "status inesperado": () => false });
}
