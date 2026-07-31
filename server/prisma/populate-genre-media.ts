// One-time follow-up to rebrand-catalog.ts — assigns real, royalty-free
// Pexels stock photos (per genre) to Game.coverImageUrl/screenshotUrls, and
// a real looping stock video to Game.coverVideoUrl for the hero carousel.
//
// This is thematic stock media matched to genre (e.g. real action/military
// photos for Shooter games) — NOT any real game's actual screenshots or box
// art, so it doesn't carry the trademark risk real game assets would. These
// are still 100% original, GameForge-owned fictional games; only their
// cover art now comes from real photography instead of generated shapes.
//
// Run manually: npx tsx prisma/populate-genre-media.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { searchPhotos, searchVideos, pickVideoFile } from '../src/services/pexels';

const prisma = new PrismaClient();

// One Pexels search query per genre — generic, thematic, nothing tied to a
// specific real game.
const GENRE_QUERIES: Record<string, string> = {
  Shooter: 'soldier tactical night mission',
  Action: 'explosion action stunt',
  'Action RPG': 'medieval warrior armor fantasy',
  Survival: 'wilderness survival campfire storm',
  Racing: 'sports car racing highway',
  Strategy: 'war room military map',
  Tactics: 'special forces squad tactical',
  Stealth: 'dark alley shadow figure night',
  Horror: 'abandoned building dark fog',
  Roguelike: 'cave dungeon torchlight',
  Simulation: 'city skyline aerial industry',
  Puzzle: 'geometric light abstract pattern',
  Adventure: 'mountain explorer hiking vista',
  Narrative: 'cinematic portrait moody light',
  'City Builder': 'city construction skyline architecture',
  Platformer: 'neon arcade retro colorful',
};

async function main() {
  const games = await prisma.game.findMany({ orderBy: { id: 'asc' } });

  const genresPresent = Array.from(new Set(games.map((g) => g.genre).filter((g): g is string => Boolean(g))));

  const photoPools: Record<string, string[]> = {};
  const videoPools: Record<string, string[]> = {};

  for (const genre of genresPresent) {
    const query = GENRE_QUERIES[genre] ?? genre;
    const photos = await searchPhotos(query, 15);
    photoPools[genre] = photos.map((p) => p.src.large);
    await new Promise((r) => setTimeout(r, 150));

    const videos = await searchVideos(query, 5);
    videoPools[genre] = videos.map(pickVideoFile).filter((v): v is string => Boolean(v));
    await new Promise((r) => setTimeout(r, 150));

    console.log(`[populate-genre-media] ${genre}: ${photoPools[genre].length} photos, ${videoPools[genre].length} videos`);
  }

  let updated = 0;
  for (const game of games) {
    if (!game.genre) continue;
    const photos = photoPools[game.genre] ?? [];
    const videos = videoPools[game.genre] ?? [];
    if (photos.length === 0) continue;

    // Deterministic-but-varied picks from the genre's pool so games sharing
    // a genre don't all show the identical photo.
    const coverIdx = hashString(game.id) % photos.length;
    const cover = photos[coverIdx];
    const screenshots = [photos[(coverIdx + 1) % photos.length], photos[(coverIdx + 2) % photos.length]].filter(
      (url) => url !== cover
    );
    const video = videos.length > 0 ? videos[hashString(`${game.id}-video`) % videos.length] : null;

    await prisma.game.update({
      where: { id: game.id },
      data: {
        coverImageUrl: cover,
        screenshotUrls: screenshots,
        coverVideoUrl: video,
      },
    });
    updated++;
  }

  console.log(`[populate-genre-media] done. updated=${updated}/${games.length}`);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
