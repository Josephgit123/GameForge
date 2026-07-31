// Single entry point for every Pexels call — mirrors the wrapper pattern in
// services/surfboard.ts and services/rawg.ts. Used ONLY to source generic,
// royalty-free, genre-themed stock photos/video for the FICTIONAL game
// catalog's cover art (see prisma/populate-genre-media.ts) — this is
// thematic stock media, not any real game's actual screenshots/box art.
//
// Lazily configured (mirrors lib/firebaseAdmin.ts / services/rawg.ts): the
// server boots fine without PEXELS_API_KEY set.

const PHOTO_BASE_URL = 'https://api.pexels.com/v1';
const VIDEO_BASE_URL = 'https://api.pexels.com/videos';

export class PexelsNotConfiguredError extends Error {}

export class PexelsApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Pexels API error (status ${status})`);
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    throw new PexelsNotConfiguredError('PEXELS_API_KEY is not set on this server');
  }
  return key;
}

async function request<T>(baseUrl: string, path: string, params: Record<string, string | number>): Promise<T> {
  const apiKey = getApiKey();
  const url = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new PexelsApiError(res.status, body);
  }
  return body as T;
}

export interface PexelsPhoto {
  id: number;
  src: { large: string; medium: string };
}

interface PexelsPhotoSearchResponse {
  photos: PexelsPhoto[];
}

export async function searchPhotos(query: string, perPage: number): Promise<PexelsPhoto[]> {
  const data = await request<PexelsPhotoSearchResponse>(PHOTO_BASE_URL, '/search', {
    query,
    per_page: perPage,
    orientation: 'landscape',
  });
  return data.photos;
}

export interface PexelsVideoFile {
  quality: string;
  width: number;
  link: string;
}

export interface PexelsVideo {
  id: number;
  video_files: PexelsVideoFile[];
}

interface PexelsVideoSearchResponse {
  videos: PexelsVideo[];
}

export async function searchVideos(query: string, perPage: number): Promise<PexelsVideo[]> {
  const data = await request<PexelsVideoSearchResponse>(VIDEO_BASE_URL, '/search', {
    query,
    per_page: perPage,
    orientation: 'landscape',
  });
  return data.videos;
}

// Picks a reasonably small (<=1080p) HD file so the hero carousel isn't
// pulling 4K video for a 440px-tall banner.
export function pickVideoFile(video: PexelsVideo): string | null {
  const hd = video.video_files
    .filter((f) => f.width && f.width <= 1920)
    .sort((a, b) => b.width - a.width)[0];
  return hd?.link ?? video.video_files[0]?.link ?? null;
}
