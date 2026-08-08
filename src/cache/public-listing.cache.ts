import { Injectable } from '@nestjs/common';

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

/**
 * Cache in-memory compartilhado:
 * - listagens públicas (where-to-play, details, hours) — TTL default 30s
 * - agenda do manager (schedules por dia) — TTL mais curto (default 10s)
 *
 * Singleflight: N requests no mesmo miss compartilham 1 query ao DB.
 * clear() em create/cancel/fix — operador vê dado fresco na hora.
 *
 * Não é compartilhado entre réplicas da API (usar Redis se multi-instância).
 */
@Injectable()
export class PublicListingCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  private readonly defaultTtlMs = Number(
    process.env.PUBLIC_LISTING_CACHE_TTL_MS || 30_000,
  );

  /** Agenda do manager: mais curta — UX de operação em tempo quase real. */
  readonly agendaTtlMs = Number(
    process.env.MANAGER_AGENDA_CACHE_TTL_MS || 10_000,
  );

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = this.defaultTtlMs,
  ): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) {
      return hit;
    }

    const pending = this.inflight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = factory()
      .then((value) => {
        this.set(key, value, ttlMs);
        this.inflight.delete(key);
        return value;
      })
      .catch((err) => {
        this.inflight.delete(key);
        throw err;
      });

    this.inflight.set(key, promise);
    return promise;
  }

  /** Invalida tudo (ops administrativas / billing). Preferir invalidateAfterMutation. */
  clear(): void {
    this.store.clear();
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalida agenda da empresa + listagens públicas afetadas.
   * Evita clear() global (agenda de outras empresas na mesma instância).
   */
  invalidateAfterMutation(opts?: {
    companyPublicId?: string;
    dateKey?: string;
    companySlug?: string;
    /** fix/unfix/populate: vários dias futuros */
    allAgendaDays?: boolean;
  }): void {
    const { companyPublicId, dateKey, companySlug, allAgendaDays } =
      opts ?? {};

    if (companyPublicId) {
      if (dateKey && !allAgendaDays) {
        this.store.delete(`agenda:${companyPublicId}:${dateKey}`);
        this.store.delete(`agenda-all:${companyPublicId}:${dateKey}`);
      } else {
        this.invalidatePrefix(`agenda:${companyPublicId}:`);
        this.invalidatePrefix(`agenda-all:${companyPublicId}:`);
      }
    } else {
      this.invalidatePrefix('agenda:');
      this.invalidatePrefix('agenda-all:');
    }

    if (companySlug) {
      this.invalidatePrefix(`details:${companySlug}:`);
      this.invalidatePrefix(`hours:${companySlug}:`);
    } else {
      this.invalidatePrefix('details:');
      this.invalidatePrefix('hours:');
    }

    // where-to-play é chave por cidade/data (sem company)
    this.invalidatePrefix('wtp:');
  }

  size(): number {
    return this.store.size;
  }
}
