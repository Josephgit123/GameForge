import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Game } from '../lib/types';
import { PriceTag } from './PriceTag';
import { GamePoster } from './GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';

interface HeroCarouselProps {
  games: Game[];
  intervalMs?: number;
  renderCta?: (game: Game) => ReactNode;
}

export function HeroCarousel({ games, intervalMs = 6000, renderCta }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || games.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % games.length), intervalMs);
    return () => clearInterval(timer);
  }, [paused, games.length, intervalMs]);

  if (games.length === 0) return null;
  const game = games[index % games.length];

  return (
    <div
      className="group relative h-[440px] overflow-hidden rounded-2xl border border-iron-700 bg-forge-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={game.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {game.coverVideoUrl ? (
            <video
              src={game.coverVideoUrl}
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              poster={hasRealCoverImage(game.coverImageUrl) ? game.coverImageUrl : undefined}
            />
          ) : hasRealCoverImage(game.coverImageUrl) ? (
            <img src={game.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <GamePoster title={game.title} genre={game.genre} seed={game.id} showText={false} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-forge-black via-forge-black/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8 md:p-12">
            <span className="font-mono text-xs uppercase tracking-widest text-ember">Featured</span>
            <h1 className="max-w-xl font-display text-3xl font-bold text-steam-100 md:text-5xl">{game.title}</h1>
            <p className="max-w-lg text-steam-400 line-clamp-2">{game.description}</p>
            <div className="flex items-center gap-4 pt-2">
              <PriceTag price={game.price} currency={game.currency} size="lg" />
              {renderCta?.(game)}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {games.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((i) => (i - 1 + games.length) % games.length)}
            className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-steam-100 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((i) => (i + 1) % games.length)}
            className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/50 text-steam-100 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/80 group-hover:opacity-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div className="absolute bottom-4 right-8 z-10 flex gap-2">
            {games.map((g, i) => (
              <button
                key={g.id}
                type="button"
                aria-label={`Show ${g.title}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === index % games.length ? 'w-6 bg-ember' : 'bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
