/**
 * Ciclo real da company:
 * - `active` — produto (trial ou pago); onboarding self-serve grava ACTIVE.
 * - `expired` — trial/plano encerrado sem renovação.
 * - `inactive` — desativado no admin (reativável).
 *
 * `onboarding` — legado / virtual: pessoas sem company na lista platform.
 * Não é gravado pelo fluxo atual de onboarding.
 */
export enum PartnerStatus {
  /** @deprecated Só lista virtual platform (person sem company). Não persistir. */
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  /** Trial encerrado sem plano pago. */
  EXPIRED = 'expired',
}
