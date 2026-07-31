// Deterministic, original "box art" theme generator — used instead of the
// placeholder stock photos (which were unrelated nature/abstract stills and
// didn't read as game covers at all). No external images, no real IP.
const PALETTE_PAIRS: [string, string][] = [
  ['#f2542d', '#5c1f10'],
  ['#2dd4bf', '#0f3d3a'],
  ['#a78bfa', '#2e2154'],
  ['#60a5fa', '#132a4a'],
  ['#34d399', '#0f3d2e'],
  ['#fbbf24', '#4a3208'],
  ['#f87171', '#4a1616'],
  ['#f2542d', '#132a4a'],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export interface PosterTheme {
  primary: string;
  secondary: string;
  angle: number;
  shapeVariant: number;
}

export function getPosterTheme(seed: string): PosterTheme {
  const idx = hashString(seed) % PALETTE_PAIRS.length;
  const [primary, secondary] = PALETTE_PAIRS[idx];
  const angle = hashString(`${seed}:angle`) % 360;
  const shapeVariant = hashString(`${seed}:shape`) % 4;
  return { primary, secondary, angle, shapeVariant };
}

// Placeholder stock photos from earlier in the build — treated as "no real
// cover" so the generated poster art shows instead.
export function hasRealCoverImage(url: string | null): url is string {
  return Boolean(url) && !url!.includes('picsum.photos');
}
