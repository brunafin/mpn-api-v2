import { CourtCompetitor } from './enums/competitor.enum';

const COMPETITOR_HOST_HINTS: Array<{
  competitor: CourtCompetitor;
  needles: string[];
}> = [
  { competitor: CourtCompetitor.WEBQUADRAS, needles: ['webquadras'] },
  { competitor: CourtCompetitor.AGENDEI, needles: ['agendei'] },
];

const SOCIAL_HOST_HINTS = [
  'instagram.com',
  'facebook.com',
  'wa.me',
  'whatsapp.com',
  'linktr.ee',
  'bio.site',
];

const RELEVANT_NAME =
  /quadra|society|arena|futebol|futsal|t[eê]nis|beach|esportiv|sport|beach[ -]?t[eê]nis|paddle|p[aá]del|volley|v[oô]lei/i;

const RELEVANT_TYPES = new Set([
  'sports_complex',
  'athletic_field',
  'stadium',
  'sports_club',
  'arena',
]);

const BRAZILIAN_UFS = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]);

const LOWERCASE_CITY_PARTICLES = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

export type PlacesSearchPlace = {
  id?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
  city?: string | null;
  uf?: string | null;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  displayName?: { text?: string; languageCode?: string };
};

export function phoneDigits(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2, 13);
  }
  return digits.slice(0, 11);
}

export function detectCompetitor(
  website: string | null | undefined,
): CourtCompetitor {
  if (!website) return CourtCompetitor.UNKNOWN;
  let host = website.toLowerCase();
  try {
    host = new URL(
      website.startsWith('http') ? website : `https://${website}`,
    ).hostname.toLowerCase();
  } catch {
    host = website.toLowerCase();
  }

  for (const { competitor, needles } of COMPETITOR_HOST_HINTS) {
    if (needles.some((needle) => host.includes(needle))) {
      return competitor;
    }
  }

  if (SOCIAL_HOST_HINTS.some((needle) => host.includes(needle))) {
    return CourtCompetitor.UNKNOWN;
  }

  return CourtCompetitor.OWN_SITE;
}

export function isRelevantPlace(place: PlacesSearchPlace): boolean {
  if (place.businessStatus === 'CLOSED_PERMANENTLY') return false;
  const name = place.displayName?.text || '';
  const types = place.types || [];
  if (RELEVANT_NAME.test(name)) return true;
  return types.some((type) => RELEVANT_TYPES.has(type));
}

export function parseCityUfFromAddress(address: string | null | undefined): {
  city: string | null;
  uf: string | null;
} {
  if (!address) return { city: null, uf: null };
  const matches = address.matchAll(
    /(?:^|,)\s*([^,]+?)\s*-\s*([A-Z]{2})(?=\s*(?:,|$))/gi,
  );
  for (const match of matches) {
    const city = match[1].trim();
    const uf = match[2].trim().toUpperCase();
    if (!BRAZILIAN_UFS.has(uf) || !/[a-zá-ú]/i.test(city)) continue;
    return { city, uf };
  }
  return { city: null, uf: null };
}

function parseCityUfFromComponents(
  components: PlacesSearchPlace['addressComponents'],
): { city: string | null; uf: string | null } {
  if (!components) return { city: null, uf: null };
  const getComponent = (type: string) =>
    components.find((component) => component.types?.includes(type));
  const city =
    getComponent('locality')?.longText ||
    getComponent('postal_town')?.longText ||
    getComponent('administrative_area_level_2')?.longText ||
    null;
  const state = getComponent('administrative_area_level_1');
  const uf = (state?.shortText || '').trim().toUpperCase();
  return {
    city: city?.trim() || null,
    uf: BRAZILIAN_UFS.has(uf) ? uf : null,
  };
}

export function normalizeName(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function formatCityName(
  value: string | null | undefined,
): string | null {
  const city = value?.trim().toLocaleLowerCase('pt-BR');
  if (!city) return null;
  let wordIndex = 0;
  return city.replace(/[^ \-'’]+/g, (word) => {
    const formatted =
      wordIndex > 0 && LOWERCASE_CITY_PARTICLES.has(word)
        ? word
        : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
    wordIndex += 1;
    return formatted;
  });
}

/** Endereço de outra cidade ou outro estado que a busca pediu. */
export function addressConflictsWithCity(
  address: string | null | undefined,
  city: string | null | undefined,
  uf: string | null | undefined,
  addressComponents?: PlacesSearchPlace['addressComponents'],
): boolean {
  const parsed = resolvePlaceCity(address, null, null, addressComponents);
  const wantedUf = (uf || '').trim().toUpperCase();
  if (parsed.uf && wantedUf && parsed.uf !== wantedUf) return true;
  if (
    parsed.city &&
    city &&
    normalizeName(parsed.city) !== normalizeName(city)
  ) {
    return true;
  }
  return false;
}

export function namesLookAlike(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
}

export type PlacePreview = {
  googlePlaceId: string;
  name: string;
  phone: string | null;
  fullAddress: string | null;
  city: string | null;
  uf: string | null;
  website: string | null;
  googleMapsUri: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  latitude: number | null;
  longitude: number | null;
  competitor: CourtCompetitor;
};

/**
 * A cidade do endereço do Google vale mais que a cidade digitada na busca.
 * "Rua Santo Antônio" em Joinville não vira Santo Antônio da Patrulha.
 */
export function resolvePlaceCity(
  address: string | null | undefined,
  fallbackCity: string | null,
  fallbackUf: string | null,
  addressComponents?: PlacesSearchPlace['addressComponents'],
): { city: string | null; uf: string | null } {
  const fromComponents = parseCityUfFromComponents(addressComponents);
  const parsed = parseCityUfFromAddress(address);
  const uf = (fromComponents.uf || parsed.uf || fallbackUf || '')
    .trim()
    .toUpperCase();
  return {
    city: fromComponents.city || parsed.city || fallbackCity || null,
    uf: uf || null,
  };
}

export function previewFromPlace(
  place: PlacesSearchPlace,
  city: string | null,
  uf: string | null,
): PlacePreview | null {
  if (!place.id) return null;
  const resolved = resolvePlaceCity(
    place.formattedAddress,
    city,
    uf,
    place.addressComponents,
  );
  return {
    googlePlaceId: place.id,
    name: place.displayName?.text?.trim() || 'Sem nome',
    phone: phoneDigits(place.nationalPhoneNumber) || null,
    fullAddress: place.formattedAddress || null,
    city: resolved.city,
    uf: resolved.uf,
    website: place.websiteUri || null,
    googleMapsUri: place.googleMapsUri || null,
    rating: place.rating ?? null,
    userRatingsTotal: place.userRatingCount ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    competitor: detectCompetitor(place.websiteUri),
  };
}

export function previewToPlace(preview: PlacePreview): PlacesSearchPlace {
  return {
    id: preview.googlePlaceId,
    displayName: { text: preview.name },
    nationalPhoneNumber: preview.phone || undefined,
    formattedAddress: preview.fullAddress || undefined,
    city: preview.city,
    uf: preview.uf,
    websiteUri: preview.website || undefined,
    googleMapsUri: preview.googleMapsUri || undefined,
    rating: preview.rating ?? undefined,
    userRatingCount: preview.userRatingsTotal ?? undefined,
    location:
      preview.latitude != null && preview.longitude != null
        ? { latitude: preview.latitude, longitude: preview.longitude }
        : undefined,
  };
}
