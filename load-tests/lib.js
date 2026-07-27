/**
 * Helpers compartilhados — scripts k6 do Marca Pra Nós
 * (k6 usa JS embutido; não tem require/npm.)
 */

import encoding from "k6/encoding";

export function todayPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function decodeJwtPayload(token) {
  const part = token.split(".")[1];
  if (!part) return {};
  const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
  const json = encoding.b64decode(padded, "rawstd", "s");
  return JSON.parse(json);
}

export function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function jsonHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}
