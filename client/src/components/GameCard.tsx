import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Game } from '../lib/types';
import { PriceTag } from './PriceTag';
import { WishlistButton } from './WishlistButton';
import { GamePoster } from './GamePoster';
import { hasRealCoverImage } from '../lib/posterArt';

interface GameCardProps {
  game: Game;
  interactive?: boolean;
  owned?: boolean;
}

export function GameCard({ game, interactive = true, owned = false }: GameCardProps) {
  const content = (
    <motion.div
      whileHover={interactive ? { y: -8 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group flex h-full flex-col overflow-hidden rounded-lg bg-iron-900"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-iron-800 shadow-lg transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-black/50">
        {hasRealCoverImage(game.coverImageUrl) ? (
          <motion.img
            src={game.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={interactive ? { scale: 1.14 } : undefined}
          />
        ) : (
          <motion.div
            whileHover={interactive ? { scale: 1.08 } : undefined}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full w-full"
          >
            <GamePoster title={game.title} genre={game.genre} seed={game.id} />
          </motion.div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {owned && (
          <span className="absolute left-2 top-2 rounded-md bg-iron-900/90 px-2 py-1 text-xs font-semibold text-teal">
            Owned
          </span>
        )}

        {interactive && <WishlistButton gameId={game.id} className="absolute right-2 top-2" />}

        {!interactive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-sm font-medium text-steam-100">Log in to view</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 pt-2">
        <div className="flex items-center gap-2 text-xs text-steam-600">
          <span>Base Game</span>
          {game.genre && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{game.genre}</span>
            </>
          )}
        </div>
        <span className="truncate font-display text-sm font-semibold leading-snug text-steam-100">{game.title}</span>
        <div className="mt-1">
          <PriceTag price={game.price} currency={game.currency} />
        </div>
      </div>
    </motion.div>
  );

  if (!interactive) {
    return <div className="h-full cursor-default">{content}</div>;
  }

  return (
    <Link to={`/games/${game.id}`} className="block h-full">
      {content}
    </Link>
  );
}
