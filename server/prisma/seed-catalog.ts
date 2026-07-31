// One-time catalog populate script — expands the demo catalog to ~160
// original, fictional games across genres/platforms for realistic browsing
// variety. Run manually: npx tsx prisma/seed-catalog.ts
//
// Idempotent: re-running updates existing games (matched by title) instead
// of creating duplicates, same contract the RAWG-import ask described —
// just sourced from originally-generated data instead of a licensed
// third-party game database, since importing real commercial titles/box
// art as sellable GameForge inventory would be a trademark/copyright
// problem regardless of the import mechanism.
import 'dotenv/config';
import { PrismaClient, GameStatus, PublisherStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'password123';

const FICTIONAL_PUBLISHERS = [
  { email: 'foundry-interactive@gameforge.dev', firstName: 'Foundry', lastName: 'Interactive' },
  { email: 'northwind-studios@gameforge.dev', firstName: 'Northwind', lastName: 'Studios' },
  { email: 'static-horizon@gameforge.dev', firstName: 'Static', lastName: 'Horizon Games' },
  { email: 'deepwater-collective@gameforge.dev', firstName: 'Deepwater', lastName: 'Collective' },
  { email: 'redline-arcade@gameforge.dev', firstName: 'Redline', lastName: 'Arcade' },
  { email: 'hollowmoon-games@gameforge.dev', firstName: 'Hollowmoon', lastName: 'Games' },
  { email: 'nightshift-studio@gameforge.dev', firstName: 'Nightshift', lastName: 'Studio' },
];

interface GenreSpec {
  genre: string;
  platforms: string[];
  priceRangeMinor: [number, number]; // SEK minor units
  descriptions: (setting: string) => string[];
}

const SETTINGS = [
  'a collapsed orbital foundry',
  'a foggy archipelago of drifting islands',
  'an abandoned research outpost',
  'a neon-drenched megacity',
  'a crumbling desert empire',
  'a frozen mountain monastery',
  'a flooded subway network',
  'a sprawling underground bunker complex',
  'a derelict generation ship',
  'a haunted coastal village',
  'a fractured timeline of the same city',
  'an overgrown botanical research station',
  'a war-torn border region',
  'a floating market district',
  'a silent mining colony',
  'a labyrinth of forgotten libraries',
  'a volcanic frontier settlement',
  'a decaying amusement park',
  'a corporate arcology',
  'an isolated lighthouse archipelago',
];

const GENRE_SPECS: GenreSpec[] = [
  {
    genre: 'Roguelike',
    platforms: ['PC', 'PC/PS5', 'PC/Xbox Series X'],
    priceRangeMinor: [15000, 25000],
    descriptions: (s) => [
      `A tactical roguelike set in ${s}, where every run rewrites the map.`,
      `Permadeath and procedurally-forged gear collide in ${s}.`,
    ],
  },
  {
    genre: 'Action',
    platforms: ['PC', 'PC/PS5/Xbox Series X'],
    priceRangeMinor: [20000, 30000],
    descriptions: (s) => [
      `A twin-stick arena shooter set in ${s} with a fully destructible battlefield.`,
      `Fast, brutal combat unfolds across ${s}.`,
    ],
  },
  {
    genre: 'Action RPG',
    platforms: ['PC', 'PC/PS5/Xbox Series X'],
    priceRangeMinor: [25000, 35000],
    descriptions: (s) => [
      `An action RPG of shifting loyalties and branching skill trees, set in ${s}.`,
      `Build a warband and carve a path through ${s}.`,
    ],
  },
  {
    genre: 'Simulation',
    platforms: ['PC'],
    priceRangeMinor: [10000, 18000],
    descriptions: (s) => [
      `A slow, cozy trading sim set across ${s}.`,
      `Manage routes, cargo, and relationships in ${s}.`,
    ],
  },
  {
    genre: 'Strategy',
    platforms: ['PC'],
    priceRangeMinor: [22000, 32000],
    descriptions: (s) => [
      `A grand strategy title of logistics and betrayal, set in ${s}.`,
      `Command factions vying for control of ${s}.`,
    ],
  },
  {
    genre: 'Puzzle',
    platforms: ['PC', 'PC/Switch'],
    priceRangeMinor: [7000, 12000],
    descriptions: (s) => [
      `A minimalist puzzle game exploring the quiet corners of ${s}.`,
      `Rearrange light and shadow to uncover secrets hidden in ${s}.`,
    ],
  },
  {
    genre: 'Adventure',
    platforms: ['PC', 'PC/Switch'],
    priceRangeMinor: [16000, 22000],
    descriptions: (s) => [
      `A narrative adventure following a lone traveler through ${s}.`,
      `Uncover a decades-old mystery buried within ${s}.`,
    ],
  },
  {
    genre: 'Narrative',
    platforms: ['PC'],
    priceRangeMinor: [6000, 9000],
    descriptions: (s) => [
      `A short, text-forward story about letting go, set in ${s}.`,
      `An intimate character study unfolding across ${s}.`,
    ],
  },
  {
    genre: 'Survival',
    platforms: ['PC', 'PC/PS5/Xbox Series X'],
    priceRangeMinor: [20000, 28000],
    descriptions: (s) => [
      `A survival crafting game set in ${s}, where every night gets harder.`,
      `Scavenge, build, and hold the line in ${s}.`,
    ],
  },
  {
    genre: 'Horror',
    platforms: ['PC', 'PC/PS5'],
    priceRangeMinor: [18000, 26000],
    descriptions: (s) => [
      `A slow-burn horror game set in ${s}, told almost entirely in silence.`,
      `Something is wrong in ${s}, and it knows you're there.`,
    ],
  },
  {
    genre: 'Racing',
    platforms: ['PC', 'PC/PS5/Xbox Series X'],
    priceRangeMinor: [22000, 30000],
    descriptions: (s) => [
      `An arcade racer weaving through the streets of ${s}.`,
      `High-speed pursuit across the shifting terrain of ${s}.`,
    ],
  },
  {
    genre: 'Tactics',
    platforms: ['PC'],
    priceRangeMinor: [22000, 30000],
    descriptions: (s) => [
      `A turn-based tactics game of squad command set in ${s}.`,
      `Position, patience, and permadeath define battles across ${s}.`,
    ],
  },
  {
    genre: 'City Builder',
    platforms: ['PC'],
    priceRangeMinor: [18000, 26000],
    descriptions: (s) => [
      `A methodical city builder rebuilding civilization atop ${s}.`,
      `Balance resources and unrest while expanding into ${s}.`,
    ],
  },
  {
    genre: 'Platformer',
    platforms: ['PC', 'PC/Switch'],
    priceRangeMinor: [12000, 18000],
    descriptions: (s) => [
      `A precision platformer bounding across the ruins of ${s}.`,
      `Tight, momentum-driven platforming through ${s}.`,
    ],
  },
  {
    genre: 'Stealth',
    platforms: ['PC', 'PC/PS5'],
    priceRangeMinor: [22000, 28000],
    descriptions: (s) => [
      `A stealth game of patience and misdirection set in ${s}.`,
      `Slip past every patrol guarding ${s}.`,
    ],
  },
];

const PREFIXES = [
  'Ashfall', 'Iron', 'Glass', 'Ember', 'Static', 'Vantage', 'Loom', 'Paper', 'Crimson', 'Silent',
  'Broken', 'Northern', 'Hollow', 'Neon', 'Rust', 'Faded', 'Wild', 'Deep', 'Last', 'First',
  'Quiet', 'Amber', 'Winter', 'Salt', 'Copper', 'Grey', 'Feral', 'Marrow', 'Driftwood', 'Ashen',
  'Violet', 'Pale', 'Wandering', 'Sunken', 'Threadbare', 'Molten', 'Coldwater', 'Lonely', 'Ivory', 'Splinter',
];
const SUFFIXES = [
  'Protocol', 'Horizon', 'Choir', 'Bloom', 'Point', 'Ledger', 'Weight', 'Tide', 'Vow', 'Signal',
  'Reach', 'Drift', 'Spire', 'Verge', 'Fold', 'Echo', 'Ward', 'Rift', 'Crown', 'Path',
  'Harbor', 'Circuit', 'Requiem', 'Compass', 'Threshold', 'Cipher', 'Hollow', 'Anchor', 'Static', 'Vigil',
  'Meridian', 'Ember', 'Wake', 'Divide', 'Bastion', 'Chorus', 'Marrow', 'Tally', 'Undertow', 'Lattice',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function systemRequirements(tier: 'low' | 'mid' | 'high') {
  const specs = {
    low: 'OS: Windows 10 64-bit\nCPU: Dual-core 2.4 GHz\nRAM: 8 GB\nGPU: Integrated graphics\nStorage: 6 GB',
    mid: 'OS: Windows 10/11 64-bit\nCPU: Quad-core 3.0 GHz\nRAM: 12 GB\nGPU: 4 GB VRAM\nStorage: 18 GB SSD',
    high: 'OS: Windows 10/11 64-bit\nCPU: 6-core 3.5 GHz\nRAM: 16 GB\nGPU: 8 GB VRAM, DX12\nStorage: 40 GB SSD',
  };
  return specs[tier];
}

const TARGET_TOTAL_GAMES = 160;

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const publisherIds: string[] = [];
  for (const p of FICTIONAL_PUBLISHERS) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { email: p.email, passwordHash, role: Role.PUBLISHER, firstName: p.firstName, lastName: p.lastName },
    });
    let publisher = await prisma.publisher.findUnique({ where: { userId: user.id } });
    if (!publisher) {
      publisher = await prisma.publisher.create({
        data: { userId: user.id, status: PublisherStatus.APPROVED },
      });
    }
    publisherIds.push(publisher.id);
  }
  // Include the original demo publisher too, for variety.
  const originalPublisherUser = await prisma.user.findUnique({ where: { email: 'publisher@gameforge.dev' } });
  if (originalPublisherUser) {
    const originalPublisher = await prisma.publisher.findUnique({ where: { userId: originalPublisherUser.id } });
    if (originalPublisher) publisherIds.push(originalPublisher.id);
  }

  const existingCount = await prisma.game.count();
  const toGenerate = Math.max(0, TARGET_TOTAL_GAMES - existingCount);

  const usedTitles = new Set((await prisma.game.findMany({ select: { title: true } })).map((g) => g.title));

  // Full prefix x suffix combination space, shuffled once — guarantees no
  // pathological collision rate the way re-hashing a small counter can.
  const allCombos: string[] = [];
  for (const prefix of PREFIXES) {
    for (const suffix of SUFFIXES) {
      allCombos.push(`${prefix} ${suffix}`);
    }
  }
  for (let i = allCombos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCombos[i], allCombos[j]] = [allCombos[j], allCombos[i]];
  }

  let created = 0;
  let updated = 0;
  let comboIndex = 0;

  for (let i = 0; usedTitles.size < existingCount + toGenerate && comboIndex < allCombos.length; i++) {
    const genreSpec = GENRE_SPECS[i % GENRE_SPECS.length];
    const title = allCombos[comboIndex];
    comboIndex++;
    if (usedTitles.has(title)) continue;
    usedTitles.add(title);

    const setting = pick(SETTINGS, hashString(title));
    const description = pick(genreSpec.descriptions(setting), hashString(`${title}-desc`));
    const platform = pick(genreSpec.platforms, hashString(`${title}-platform`));
    const [minPrice, maxPrice] = genreSpec.priceRangeMinor;
    const priceStep = 500; // round to nearest SEK 5.00
    const price =
      minPrice + Math.round(((hashString(`${title}-price`) % (maxPrice - minPrice)) / priceStep)) * priceStep;
    const tier = price >= 25000 ? 'high' : price >= 15000 ? 'mid' : 'low';
    const publisherId = publisherIds[hashString(`${title}-pub`) % publisherIds.length];
    const daysAgo = hashString(`${title}-age`) % 400;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const existing = await prisma.game.findFirst({ where: { title } });
    if (existing) {
      await prisma.game.update({
        where: { id: existing.id },
        data: { description, genre: genreSpec.genre, platform, systemRequirements: systemRequirements(tier) },
      });
      updated++;
    } else {
      await prisma.game.create({
        data: {
          publisherId,
          title,
          description,
          price,
          currency: 'SEK',
          status: GameStatus.PUBLISHED,
          genre: genreSpec.genre,
          platform,
          systemRequirements: systemRequirements(tier),
          screenshotUrls: [],
          createdAt,
        },
      });
      created++;
    }
  }

  const finalCount = await prisma.game.count();
  console.log(`[seed-catalog] done. created=${created} updated=${updated} totalGames=${finalCount}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
