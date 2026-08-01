import { motion } from 'framer-motion';
import { GamePoster } from './GamePoster';
import { PriceTag } from './PriceTag';
import { hasRealCoverImage } from '../lib/posterArt';
import type { Game } from '../lib/types';

interface PublisherGameCardProps {
  game: Game;
  isTopSeller?: boolean;
  layout?: 'grid' | 'list';
  onEdit: () => void;
  onToggleStatus: () => void;
}

function StatusBadge({ status }: { status: Game['status'] }) {
  const classes =
    status === 'PUBLISHED'
      ? 'bg-success/15 text-success'
      : status === 'DRAFT'
      ? 'bg-warning/15 text-warning'
      : 'bg-danger/15 text-danger';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classes}`}>{status}</span>;
}

export function PublisherGameCard({ game, isTopSeller, layout = 'grid', onEdit, onToggleStatus }: PublisherGameCardProps) {
  const cover = (
    <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-lg bg-iron-800 sm:w-24 sm:aspect-square">
      {hasRealCoverImage(game.coverImageUrl) ? (
        <img src={game.coverImageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <GamePoster title={game.title} genre={game.genre} seed={game.id} showText={false} />
      )}
      {isTopSeller && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-ember px-1.5 py-0.5 text-[10px] font-bold text-iron-900">
          TOP SELLER
        </span>
      )}
    </div>
  );

  if (layout === 'list') {
    return (
      <motion.div
        layout
        className="flex items-center gap-4 rounded-xl border border-iron-700 bg-iron-900 p-3 transition-colors hover:border-iron-600"
      >
        {cover}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-sm font-semibold text-steam-100">{game.title}</span>
            <StatusBadge status={game.status} />
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-steam-600">
            {game.genre && <span>{game.genre}</span>}
            {game.platform && (
              <>
                <span aria-hidden="true">·</span>
                <span>{game.platform}</span>
              </>
            )}
          </div>
        </div>
        <PriceTag price={game.price} currency={game.currency} />
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onEdit} className="rounded-md border border-iron-700 px-3 py-1.5 text-xs font-medium text-steam-100 hover:bg-iron-800">
            Edit
          </button>
          {game.status !== 'DELISTED' && (
            <button
              type="button"
              onClick={onToggleStatus}
              className="rounded-md border border-iron-700 px-3 py-1.5 text-xs font-medium text-steam-100 hover:bg-iron-800"
            >
              {game.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      className="flex flex-col overflow-hidden rounded-xl border border-iron-700 bg-iron-900 transition-colors hover:border-iron-600"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-iron-800">
        {hasRealCoverImage(game.coverImageUrl) ? (
          <img src={game.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <GamePoster title={game.title} genre={game.genre} seed={game.id} showText={false} />
        )}
        {isTopSeller && (
          <span className="absolute left-2 top-2 rounded-md bg-ember px-2 py-0.5 text-[10px] font-bold text-iron-900">
            TOP SELLER
          </span>
        )}
        <span className="absolute right-2 top-2">
          <StatusBadge status={game.status} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="truncate font-display text-sm font-semibold text-steam-100">{game.title}</span>
        <div className="flex items-center gap-2 text-xs text-steam-600">
          {game.genre && <span>{game.genre}</span>}
          {game.platform && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{game.platform}</span>
            </>
          )}
        </div>
        <PriceTag price={game.price} currency={game.currency} />
        <div className="mt-auto flex gap-2 pt-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-md border border-iron-700 py-1.5 text-xs font-medium text-steam-100 hover:bg-iron-800"
          >
            Edit
          </button>
          {game.status !== 'DELISTED' && (
            <button
              type="button"
              onClick={onToggleStatus}
              className="flex-1 rounded-md border border-iron-700 py-1.5 text-xs font-medium text-steam-100 hover:bg-iron-800"
            >
              {game.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
