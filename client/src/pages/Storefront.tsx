import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { HeroCarousel } from '../components/HeroCarousel';
import { GameCard } from '../components/GameCard';
import { GameCardSkeleton, HeroSkeleton } from '../components/SkeletonLoader';
import type { Game, LibraryEntry, TopSellerEntry } from '../lib/types';

const ACCENT_CLASSES = {
  gold: 'text-gold',
  violet: 'text-violet',
} as const;

function Shelf({
  title,
  games,
  ownedIds,
  interactive,
  accent,
  subtitle,
}: {
  title: string;
  games: Game[];
  ownedIds: Set<string>;
  interactive: boolean;
  accent?: keyof typeof ACCENT_CLASSES;
  subtitle?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  if (games.length === 0) return null;

  function scrollBy(amount: number) {
    scrollerRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link
            to="/categories"
            className={`group flex items-center gap-1.5 font-display text-xl font-semibold ${accent ? ACCENT_CLASSES[accent] : 'text-steam-100'}`}
          >
            {title}
            <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="translate-x-0 text-steam-400 transition-transform group-hover:translate-x-1 group-hover:text-steam-100"
          >
            <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
          {subtitle && <p className="mt-0.5 text-xs text-steam-600">{subtitle}</p>}
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-600)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-iron-700 text-steam-400 hover:bg-iron-800 hover:text-steam-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(600)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-iron-700 text-steam-400 hover:bg-iron-800 hover:text-steam-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none]">
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className="w-40 shrink-0 snap-start sm:w-48"
          >
            <GameCard game={game} owned={ownedIds.has(game.id)} interactive={interactive} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Storefront() {
  const { user, token } = useAuth();
  const { isActiveMember } = useSubscription();
  const isCustomer = user?.role === 'CUSTOMER';
  const [games, setGames] = useState<Game[] | null>(null);
  const [topSellers, setTopSellers] = useState<TopSellerEntry[] | null>(null);
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ games: Game[] }>('/games')
      .then((res) => setGames(res.games))
      .catch(() => setError('Could not load the storefront right now.'));
    api
      .get<{ games: TopSellerEntry[] }>('/games/top-sellers')
      .then((res) => setTopSellers(res.games))
      .catch(() => setTopSellers([]));
  }, []);

  useEffect(() => {
    if (!isCustomer) return;
    api
      .get<{ entries: LibraryEntry[] }>('/library', token)
      .then((res) => setLibraryEntries(res.entries))
      .catch(() => {});
  }, [isCustomer, token]);

  const ownedIds = new Set(libraryEntries.map((e) => e.gameId));

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-danger">{error}</div>
      </div>
    );
  }

  if (!games) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <HeroSkeleton />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center text-steam-400">No games published yet.</div>
    );
  }

  const SHELF_SIZE = 20;
  const recentlyReleased = [...games]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, SHELF_SIZE);
  const freeGames = games.filter((g) => g.price === 0).slice(0, SHELF_SIZE);
  const allGamesPreview = games.slice(0, SHELF_SIZE);
  const featuredForHero = topSellers && topSellers.length > 0 ? topSellers.map((t) => t.game) : games.slice(0, 5);

  // --- Premium Game Collections (item 2) — open to everyone as discovery/
  // upsell, reusing existing game data via the flags set on Game, no
  // duplicate products created. ---
  const exclusiveGames = games.filter((g) => g.gameForgePlusExclusive).slice(0, SHELF_SIZE);
  const memberDeals = games.filter((g) => g.featured).slice(0, SHELF_SIZE);
  // "Premium Bundles" — a curated shelf (highest-priced exclusive titles),
  // not a real combined-purchase bundle mechanic (that would need new
  // pricing/order logic, out of scope here).
  const premiumBundles = [...exclusiveGames].sort((a, b) => b.price - a.price).slice(0, 8);

  // --- AI Recommendations (item 6) — deterministic logic over existing
  // game/library metadata, no ML involved. ---
  const ownedGames = libraryEntries.map((e) => e.game);
  const genreCounts = new Map<string, number>();
  for (const g of ownedGames) {
    if (g.genre) genreCounts.set(g.genre, (genreCounts.get(g.genre) ?? 0) + 1);
  }
  const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const recommendedForYou = topGenre
    ? games.filter((g) => g.genre === topGenre && !ownedIds.has(g.id)).slice(0, SHELF_SIZE)
    : [];

  const mostRecentEntry = [...libraryEntries].sort(
    (a, b) => new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
  )[0];
  const becauseYouPlayed = mostRecentEntry
    ? games
        .filter(
          (g) =>
            !ownedIds.has(g.id) &&
            (g.genre === mostRecentEntry.game.genre || g.publisherId === mostRecentEntry.game.publisherId)
        )
        .slice(0, SHELF_SIZE)
    : [];

  // Member-only AI sections — a genuine perk, unlike the open Premium
  // Collections shelves above.
  const trendingForMembers = (topSellers ?? [])
    .map((t) => t.game)
    .filter((g) => g.gameForgePlusExclusive || g.featured)
    .slice(0, SHELF_SIZE);
  const exclusiveMemberPicks = [...exclusiveGames]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, SHELF_SIZE);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <HeroCarousel
          games={featuredForHero}
          renderCta={(game) =>
            isCustomer ? (
              <Link
                to={`/games/${game.id}`}
                className="rounded-md bg-ember px-6 py-3 font-semibold text-iron-900 transition-colors hover:bg-[#ff6a43]"
              >
                View game
              </Link>
            ) : (
              <Link to="/login" className="rounded-md border border-white/30 px-6 py-3 font-semibold text-steam-100 hover:bg-white/10">
                Log in to view
              </Link>
            )
          }
        />
      </div>

      {isActiveMember && (
        <>
          <Shelf
            title="Exclusive Member Picks"
            subtitle="Unlocked because you're a GameForge+ member"
            games={exclusiveMemberPicks}
            ownedIds={ownedIds}
            interactive={isCustomer}
            accent="gold"
          />
          <Shelf
            title="Trending for Members"
            games={trendingForMembers}
            ownedIds={ownedIds}
            interactive={isCustomer}
            accent="gold"
          />
        </>
      )}

      {recommendedForYou.length > 0 && (
        <Shelf title="Recommended for You" games={recommendedForYou} ownedIds={ownedIds} interactive={isCustomer} />
      )}
      {becauseYouPlayed.length > 0 && mostRecentEntry && (
        <Shelf
          title={`Because You Played ${mostRecentEntry.game.title}`}
          games={becauseYouPlayed}
          ownedIds={ownedIds}
          interactive={isCustomer}
        />
      )}

      {topSellers && topSellers.length > 0 && (
        <Shelf title="Top Sellers" games={topSellers.map((t) => t.game)} ownedIds={ownedIds} interactive={isCustomer} />
      )}

      <Shelf
        title="GameForge+ Exclusive"
        subtitle="Available to everyone — GameForge+ members get 10% off"
        games={exclusiveGames}
        ownedIds={ownedIds}
        interactive={isCustomer}
        accent="violet"
      />
      <Shelf title="Members Only Deals" games={memberDeals} ownedIds={ownedIds} interactive={isCustomer} accent="violet" />
      <Shelf title="Premium Bundles" games={premiumBundles} ownedIds={ownedIds} interactive={isCustomer} accent="violet" />

      <Shelf title="Recently Released" games={recentlyReleased} ownedIds={ownedIds} interactive={isCustomer} />
      {freeGames.length > 0 && (
        <Shelf title="Free Games" games={freeGames} ownedIds={ownedIds} interactive={isCustomer} />
      )}
      <Shelf title="All Games" games={allGamesPreview} ownedIds={ownedIds} interactive={isCustomer} />
      <div className="mx-auto max-w-7xl px-6 pb-12 text-center">
        <Link
          to="/categories"
          className="inline-block rounded-md border border-iron-700 px-6 py-3 font-semibold text-steam-100 hover:bg-iron-800"
        >
          Browse all {games.length} games
        </Link>
      </div>
    </div>
  );
}
