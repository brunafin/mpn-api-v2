/** Períodos do portal público (alinhado ao mpn-front listingFilters). */
export type PublicListingPeriod = 'morning' | 'afternoon' | 'evening';

export function parsePublicListingPeriod(
  raw?: string | null,
): PublicListingPeriod | undefined {
  const value = raw?.trim().toLowerCase();
  if (value === 'morning' || value === 'afternoon' || value === 'evening') {
    return value;
  }
  return undefined;
}

/** Manhã &lt;12 · Tarde &lt;18 · Noite ≥18 (ou madrugada &lt;5). */
export function hourInPublicListingPeriod(
  startHour: string,
  period?: PublicListingPeriod | null,
): boolean {
  if (!period) return true;
  const hour = Number.parseInt(String(startHour).slice(0, 2), 10);
  if (Number.isNaN(hour)) return true;
  if (period === 'morning') return hour >= 5 && hour < 12;
  if (period === 'afternoon') return hour >= 12 && hour < 18;
  if (period === 'evening') return hour >= 18 || hour < 5;
  return true;
}
