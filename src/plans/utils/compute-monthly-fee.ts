/**
 * Mensalidade = base + (quadras extras × preço por quadra).
 * A 1ª quadra entra na base; a partir da 2ª cobra price_per_court.
 * Em trial ativo, retorna 0.
 *
 * Ex.: base 100, +10/quadra → 1 quadra = 100; 2 = 110; 3 = 120.
 */
export function computeMonthlyFee(params: {
  basePrice: number | string | null | undefined;
  pricePerCourt: number | string | null | undefined;
  courtsCount: number;
  isTrial?: boolean;
}): number {
  if (params.isTrial) return 0;
  const base = Number(params.basePrice ?? 0);
  const perCourt = Number(params.pricePerCourt ?? 0);
  const courts = Math.max(0, Number(params.courtsCount ?? 0));
  const extraCourts = Math.max(0, courts - 1);
  return Number((base + perCourt * extraCourts).toFixed(2));
}
