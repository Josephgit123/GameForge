// One-time follow-up to seed-catalog.ts — re-themes the existing 160
// fictional games with punchier, more blockbuster-style names/descriptions
// and shifts the genre mix toward Action/Shooter, per user request. Renames
// IN PLACE (same row id, same publisher/price/createdAt) — only
// title/description/genre/platform/systemRequirements change, so nothing
// referencing gameId (LibraryEntry, OrderItem) is affected.
//
// Still 100% original titles/copy — no real trademarked names. See
// seed-catalog.ts's header comment for why real commercial titles don't go
// in this (sellable, Surfboard-linked) table; real titles live in the
// separate, non-purchasable RawgGame table instead (server/src/routes/discover.ts).
//
// Run manually: npx tsx prisma/rebrand-catalog.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GenreSpec {
  genre: string;
  platforms: string[];
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

// Weight = how many slots each genre gets in the round-robin cycle below.
// Shooter + Action + Action RPG together take 8/20 slots (40%) — the rest
// split the remaining 60% evenly, so the catalog reads action/shooter-first
// like a real PC bestseller list, without losing genre variety entirely.
const GENRE_SPECS: { spec: GenreSpec; weight: number }[] = [
  {
    weight: 3,
    spec: {
      genre: 'Shooter',
      platforms: ['PC', 'PC/PS5/Xbox Series X'],
      descriptions: (s) => [
        `Lock in and clear ${s} room by room in an unforgiving tactical shooter where one bad peek ends the run.`,
        `Squad up for an all-out firefight through ${s} — every engagement is a fight for the last bullet.`,
        `A high-stakes military shooter set in ${s}, built around split-second calls and zero second chances.`,
      ],
    },
  },
  {
    weight: 3,
    spec: {
      genre: 'Action',
      platforms: ['PC', 'PC/PS5/Xbox Series X'],
      descriptions: (s) => [
        `Nonstop, high-octane combat tears through ${s} — dodge, counter, and dominate every encounter.`,
        `An adrenaline-fueled action blockbuster set in ${s}, where only the fastest survive the fight.`,
        `Brutal, kinetic combat and a fully destructible battlefield collide across ${s}.`,
      ],
    },
  },
  {
    weight: 2,
    spec: {
      genre: 'Action RPG',
      platforms: ['PC', 'PC/PS5/Xbox Series X'],
      descriptions: (s) => [
        `Forge your legend through ${s} in an epic action RPG of loot, power, and consequence.`,
        `Rise from nothing to warlord across the battle-scarred reaches of ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Survival',
      platforms: ['PC', 'PC/PS5/Xbox Series X'],
      descriptions: (s) => [
        `Scavenge, build, and hold the line through ${s} — every night hits harder than the last.`,
        `A brutal survival crafting game set in ${s}, where the odds are never in your favor.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Racing',
      platforms: ['PC', 'PC/PS5/Xbox Series X'],
      descriptions: (s) => [
        `Redline it through the streets of ${s} in an arcade racer built for pure speed.`,
        `High-speed pursuit and razor-thin margins define every race across ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Strategy',
      platforms: ['PC'],
      descriptions: (s) => [
        `Command the front lines of ${s} in a grand strategy epic of logistics and betrayal.`,
        `Total war reshapes ${s} — outthink every rival faction or lose everything.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Tactics',
      platforms: ['PC'],
      descriptions: (s) => [
        `Command a squad through ${s} in a brutal turn-based tactics campaign where every move counts.`,
        `Position, patience, and permadeath define every battle across ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Stealth',
      platforms: ['PC', 'PC/PS5'],
      descriptions: (s) => [
        `Slip past every patrol guarding ${s} in a tense stealth thriller with lethal stakes.`,
        `One alarm ends the mission — infiltrate ${s} without leaving a trace.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Horror',
      platforms: ['PC', 'PC/PS5'],
      descriptions: (s) => [
        `Something is hunting you through ${s}, and it already knows where you're hiding.`,
        `A relentless survival-horror descent into ${s}, told almost entirely in silence.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Roguelike',
      platforms: ['PC', 'PC/PS5', 'PC/Xbox Series X'],
      descriptions: (s) => [
        `A brutal roguelike run through ${s}, where every death rewrites the map and raises the stakes.`,
        `Permadeath and procedurally-forged gear collide across ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Simulation',
      platforms: ['PC'],
      descriptions: (s) => [
        `Build an empire from nothing across ${s} in a deep, systems-driven management sim.`,
        `Every decision compounds as you manage operations across ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Puzzle',
      platforms: ['PC', 'PC/Switch'],
      descriptions: (s) => [
        `A razor-sharp puzzle gauntlet hidden inside ${s} — every solution unlocks the next threat.`,
        `Outthink every trap built into the ruins of ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Adventure',
      platforms: ['PC', 'PC/Switch'],
      descriptions: (s) => [
        `A high-stakes adventure chasing a decades-old conspiracy through ${s}.`,
        `Uncover a buried secret that could tear ${s} apart.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Narrative',
      platforms: ['PC'],
      descriptions: (s) => [
        `A gripping, character-driven story of survival and betrayal set in ${s}.`,
        `One choice changes everything in this tense narrative thriller set across ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'City Builder',
      platforms: ['PC'],
      descriptions: (s) => [
        `Rebuild civilization from the ashes atop ${s} — one crisis from collapse at all times.`,
        `Balance growth, unrest, and disaster while expanding into ${s}.`,
      ],
    },
  },
  {
    weight: 1,
    spec: {
      genre: 'Platformer',
      platforms: ['PC', 'PC/Switch'],
      descriptions: (s) => [
        `A blistering, momentum-driven platformer bounding across the ruins of ${s}.`,
        `Precision platforming meets high stakes across the wreckage of ${s}.`,
      ],
    },
  },
];

// Expands weights into a flat round-robin cycle, e.g. Shooter appears 3x
// more often than a weight-1 genre when walking games in id order.
const GENRE_CYCLE: GenreSpec[] = GENRE_SPECS.flatMap(({ spec, weight }) => Array(weight).fill(spec));

const PREFIXES = [
  'Ashfall', 'Iron', 'Ember', 'Static', 'Crimson', 'Silent', 'Broken', 'Northern', 'Hollow', 'Neon',
  'Rust', 'Faded', 'Wild', 'Deep', 'Last', 'Winter', 'Copper', 'Grey', 'Feral', 'Molten',
  'Coldwater', 'Splinter', 'Redline', 'Blitz', 'Havoc', 'Nightfall', 'Blacksite', 'Ironclad', 'Deadlock', 'Blackout',
  'Vendetta', 'Reckoning', 'Siege', 'Wraith', 'Warpath', 'Ambush', 'Ironsight', 'Overkill', 'Payload', 'Warfront',
];
const SUFFIXES = [
  'Protocol', 'Horizon', 'Point', 'Signal', 'Reach', 'Drift', 'Spire', 'Verge', 'Echo', 'Ward',
  'Rift', 'Crown', 'Path', 'Harbor', 'Circuit', 'Compass', 'Threshold', 'Cipher', 'Hollow', 'Anchor',
  'Vigil', 'Meridian', 'Wake', 'Divide', 'Bastion', 'Undertow', 'Lattice', 'Strike', 'Frontline', 'Breach',
  'Offensive', 'Uprising', 'Directive', 'Ascendant', 'Endgame', 'Collapse', 'Killswitch', 'Vanguard', 'Overdrive', 'Fallback',
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

async function main() {
  const games = await prisma.game.findMany({ orderBy: { id: 'asc' } });

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

  if (allCombos.length < games.length) {
    throw new Error(`Not enough name combos (${allCombos.length}) for ${games.length} games`);
  }

  const genreCounts: Record<string, number> = {};

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const genreSpec = GENRE_CYCLE[i % GENRE_CYCLE.length];
    const title = allCombos[i];

    const setting = pick(SETTINGS, hashString(title));
    const description = pick(genreSpec.descriptions(setting), hashString(`${title}-desc`));
    const platform = pick(genreSpec.platforms, hashString(`${title}-platform`));
    const tier = game.price >= 25000 ? 'high' : game.price >= 15000 ? 'mid' : 'low';

    await prisma.game.update({
      where: { id: game.id },
      data: {
        title,
        description,
        genre: genreSpec.genre,
        platform,
        systemRequirements: systemRequirements(tier),
      },
    });

    genreCounts[genreSpec.genre] = (genreCounts[genreSpec.genre] ?? 0) + 1;
  }

  console.log(`[rebrand-catalog] renamed ${games.length} games.`);
  console.log('[rebrand-catalog] new genre distribution:', genreCounts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
