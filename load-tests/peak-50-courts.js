/**
 * Pico com ~50 quadras ativas — leituras públicas + agenda do manager
 *
 * Simula sexta à noite: browsers no "encontre onde jogar" + operadores
 * atualizando a agenda no manager.
 *
 * Uso:
 *   k6 run load-tests/peak-50-courts.js \
 *     -e BASE_URL=http://localhost:3001 \
 *     -e UF=RS -e CITY=Porto Alegre \
 *     -e SLUG=sua-arena \
 *     -e MANAGER_USER=user -e MANAGER_PASS=secret
 *
 * Sem credenciais de manager, só roda o cenário público.
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  authHeaders,
  decodeJwtPayload,
  jsonHeaders,
  todayPlusDays,
} from "./lib.js";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const UF = __ENV.UF || "RS";
const CITY = __ENV.CITY || "";
const SLUG = __ENV.SLUG || "";
const MANAGER_USER = __ENV.MANAGER_USER || "";
const MANAGER_PASS = __ENV.MANAGER_PASS || "";
const DATE = __ENV.DATE || todayPlusDays(1);

const hasManager = Boolean(MANAGER_USER && MANAGER_PASS);

const whereToPlayTrend = new Trend("where_to_play_ms");
const detailsTrend = new Trend("details_ms");
const hoursTrend = new Trend("available_hours_ms");
const agendaTrend = new Trend("manager_agenda_ms");
const errorRate = new Rate("errors");

export const options = {
  scenarios: {
    // ~80 browsers públicos no pico (modelo da análise)
    public_browsers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "2m", target: 80 },
        { duration: "1m", target: 80 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
      exec: "publicBrowse",
    },
    // ~25 managers refresheando agenda
    ...(hasManager
      ? {
          managers: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
              { duration: "30s", target: 10 },
              { duration: "1m", target: 20 },
              { duration: "2m", target: 25 },
              { duration: "1m", target: 25 },
              { duration: "30s", target: 0 },
            ],
            gracefulRampDown: "20s",
            exec: "managerAgenda",
            startTime: "10s",
          },
        }
      : {}),
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    errors: ["rate<0.05"],
    where_to_play_ms: ["p(95)<800"],
    details_ms: ["p(95)<1000"],
    available_hours_ms: ["p(95)<400"],
    ...(hasManager ? { manager_agenda_ms: ["p(95)<400"] } : {}),
  },
};

export function setup() {
  const out = {
    baseUrl: BASE_URL,
    date: DATE,
    uf: UF,
    city: CITY,
    slug: SLUG,
    token: null,
    companyPublicId: null,
  };

  // Slug independente do manager — sem ele, details/hours não rodam
  if (!out.slug) {
    const qs = [`date=${DATE}`, `uf=${encodeURIComponent(UF)}`];
    if (CITY) qs.push(`city=${encodeURIComponent(CITY)}`);
    const list = http.get(
      `${BASE_URL}/public-court-schedules/where-to-play?${qs.join("&")}`,
      { tags: { name: "setup_where_to_play" } },
    );
    if (list.status === 200) {
      try {
        const body = list.json();
        const first =
          (body.courtsWithHours && body.courtsWithHours[0]) ||
          (body.courtsWithoutHours && body.courtsWithoutHours[0]);
        if (first && first.slug) {
          out.slug = first.slug;
          console.log(`[k6] SLUG auto: ${out.slug}`);
        } else {
          console.warn(
            "[k6] where-to-play sem arenas. Remova CITY ou passe -e SLUG=... (ex.: bruna-sports).",
          );
        }
      } catch (e) {
        console.warn("[k6] falha ao parsear where-to-play no setup:", e);
      }
    } else {
      console.warn(
        `[k6] setup where-to-play status=${list.status} body=${String(list.body).slice(0, 200)}`,
      );
    }
  }

  // Valida slug: available-hours retorna []+200 mesmo com slug inválido;
  // details é o que 404 — sem esse probe o teste “mente” com 25% de erro.
  if (out.slug) {
    const probe = http.get(
      `${BASE_URL}/public-court-schedules/details?slug=${encodeURIComponent(out.slug)}&date=${DATE}`,
      { tags: { name: "setup_details_probe" } },
    );
    if (probe.status !== 200) {
      console.error(
        `[k6] SLUG inválido "${out.slug}": details status=${probe.status} body=${String(probe.body).slice(0, 200)}`,
      );
      console.warn("[k6] Zerando SLUG — details/hours não serão chamados.");
      out.slug = "";
    } else {
      console.log(`[k6] details probe ok para slug=${out.slug}`);
    }
  }

  if (!hasManager) {
    console.warn(
      "[k6] MANAGER_USER/MANAGER_PASS não definidos — só cenário público.",
    );
    return out;
  }

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      username: MANAGER_USER,
      password: MANAGER_PASS,
    }),
    { headers: jsonHeaders(), tags: { name: "auth_login" } },
  );

  const ok = check(loginRes, {
    "login 200": (r) => r.status === 200,
    "login tem access_token": (r) => {
      try {
        return Boolean(r.json("access_token"));
      } catch (_) {
        return false;
      }
    },
  });
  errorRate.add(!ok);

  if (!ok) {
    console.error(
      `[k6] Login falhou: status=${loginRes.status} body=${String(loginRes.body).slice(0, 300)}`,
    );
    console.warn(
      "[k6] Cenário managers desligado. Público continua (details/hours se houver SLUG).",
    );
    return out;
  }

  const token = loginRes.json("access_token");
  const payload = decodeJwtPayload(token);
  out.token = token;
  out.companyPublicId =
    __ENV.COMPANY_PUBLIC_ID || payload.companyPublicId || null;

  if (!out.companyPublicId) {
    console.error(
      "[k6] companyPublicId ausente no JWT. Passe -e COMPANY_PUBLIC_ID=...",
    );
  }

  console.log(
    `[k6] setup ok · date=${out.date} · company=${out.companyPublicId} · slug=${out.slug || "(nenhum)"}`,
  );
  return out;
}

export function publicBrowse(data) {
  const date = data.date;
  const slug = data.slug || SLUG;

  group("público · where-to-play", () => {
    const qs = [`date=${date}`, `uf=${encodeURIComponent(data.uf)}`];
    if (data.city) qs.push(`city=${encodeURIComponent(data.city)}`);
    const res = http.get(
      `${data.baseUrl}/public-court-schedules/where-to-play?${qs.join("&")}`,
      { tags: { name: "where_to_play" } },
    );
    whereToPlayTrend.add(res.timings.duration);
    const ok = check(res, {
      "where-to-play 200": (r) => r.status === 200,
      "where-to-play JSON": (r) => {
        try {
          const b = r.json();
          return b && Array.isArray(b.courtsWithHours);
        } catch (_) {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  if (slug) {
    group("público · details", () => {
      const res = http.get(
        `${data.baseUrl}/public-court-schedules/details?slug=${encodeURIComponent(slug)}&date=${date}`,
        { tags: { name: "details" } },
      );
      detailsTrend.add(res.timings.duration);
      if (res.status !== 200 && __ITER < 3) {
        console.error(
          `[k6] details fail status=${res.status} slug=${slug} body=${String(res.body).slice(0, 180)}`,
        );
      }
      const ok = check(res, {
        "details 200": (r) => r.status === 200,
        "details tem courts": (r) => {
          try {
            return Array.isArray(r.json("courts"));
          } catch (_) {
            return false;
          }
        },
      });
      errorRate.add(!ok);
    });

    group("público · available-hours", () => {
      const res = http.get(
        `${data.baseUrl}/public-court-schedules/available-hours-by-court?slug=${encodeURIComponent(slug)}&date=${date}`,
        { tags: { name: "available_hours" } },
      );
      hoursTrend.add(res.timings.duration);
      const ok = check(res, {
        "available-hours 200": (r) => r.status === 200,
      });
      errorRate.add(!ok);
    });
  }

  // Think time: usuário olhando a lista / mudando filtros
  sleep(1 + Math.random() * 2);
}

export function managerAgenda(data) {
  if (!data.token || !data.companyPublicId) {
    sleep(1);
    return;
  }

  group("manager · agenda do dia", () => {
    const res = http.get(
      `${data.baseUrl}/companies/${data.companyPublicId}/schedules/${data.date}`,
      {
        headers: authHeaders(data.token),
        tags: { name: "manager_agenda" },
      },
    );
    agendaTrend.add(res.timings.duration);
    const ok = check(res, {
      "agenda 200": (r) => r.status === 200,
      "agenda é array": (r) => {
        try {
          return Array.isArray(r.json());
        } catch (_) {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.5 + Math.random());
}
