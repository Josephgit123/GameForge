// Single entry point for every RAWG API call — mirrors the wrapper pattern
// in services/surfboard.ts. RAWG (https://rawg.io/apidocs) is used ONLY to
// populate the read-only RawgGame reference table (see schema.prisma). That
// table has no relation to Game/Order/Payment — nothing imported through
// this service is or can become purchasable inventory.
//
// Lazily configured (mirrors lib/firebaseAdmin.ts): the server boots fine
// without RAWG_API_KEY set, and only the admin import/list routes report
// 503 if it's missing, instead of the whole process failing to start.

const BASE_URL = process.env.RAWG_API_BASE_URL ?? 'https://api.rawg.io/api';

export class RawgNotConfiguredError extends Error {}

export class RawgApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`RAWG API error (status ${status})`);
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new RawgNotConfiguredError('RAWG_API_KEY is not set on this server');
  }
  return key;
}

async function request<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString());
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new RawgApiError(res.status, body);
  }
  return body as T;
}

export interface RawgListItem {
  id: number;
  slug: string;
  name: string;
  background_image: string | null;
  released: string | null;
  rating: number | null;
  metacritic: number | null;
  esrb_rating: { name: string } | null;
  genres: { name: string }[];
  platforms: { platform: { name: string } }[] | null;
}

interface RawgListResponse {
  results: RawgListItem[];
  next: string | null;
}

// Popularity-ordered list page (RAWG's own "added" ordering — how many RAWG
// users have this in a list — used as a stand-in for "popular").
export async function listPopularGames(page: number, pageSize: number): Promise<RawgListItem[]> {
  const data = await request<RawgListResponse>('/games', {
    page,
    page_size: pageSize,
    ordering: '-added',
  });
  return data.results;
}

export interface RawgGameDetail {
  id: number;
  description_raw: string | null;
}

export async function getGameDescription(rawgId: number): Promise<string | null> {
  const data = await request<RawgGameDetail>(`/games/${rawgId}`);
  return data.description_raw ?? null;
}
