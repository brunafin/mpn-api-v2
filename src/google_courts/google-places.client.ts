import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PlacesSearchPlace } from './google-court.helpers';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.formattedAddress',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.types',
  'nextPageToken',
].join(',');

export type PlacesTextSearchPage = {
  places: PlacesSearchPlace[];
  nextPageToken?: string;
};

type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

const defaultFetch: FetchLike = fetch as FetchLike;

@Injectable()
export class GooglePlacesClient {
  private fetchImpl: FetchLike = defaultFetch;

  get apiKey(): string {
    return process.env.GOOGLE_PLACES_API_KEY?.trim() || '';
  }

  assertConfigured(): void {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'GOOGLE_PLACES_API_KEY não configurada. Defina a chave da Places API (New) no ambiente da API.',
      );
    }
  }

  async searchText(
    textQuery: string,
    pageToken?: string,
  ): Promise<PlacesTextSearchPage> {
    this.assertConfigured();

    const body: Record<string, unknown> = {
      textQuery,
      languageCode: 'pt-BR',
      regionCode: 'BR',
      pageSize: 20,
    };
    if (pageToken) body.pageToken = pageToken;

    const response = await this.fetchImpl(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Google Places recusou a busca (${response.status}). ${detail.slice(0, 180)}`.trim(),
      );
    }

    const payload = (await response.json()) as PlacesTextSearchPage;
    return {
      places: payload.places || [],
      nextPageToken: payload.nextPageToken,
    };
  }

  async searchAllPages(
    textQuery: string,
    maxPages = 2,
  ): Promise<PlacesSearchPlace[]> {
    const collected: PlacesSearchPlace[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.searchText(textQuery, pageToken);
      collected.push(...result.places);
      if (!result.nextPageToken) break;
      pageToken = result.nextPageToken;
    }

    return collected;
  }
}
