import { motion } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';

interface WishlistButtonProps {
  gameId: string;
  className?: string;
}

export function WishlistButton({ gameId, className = '' }: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const active = isWishlisted(gameId);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(gameId);
      }}
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/80 ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={active ? '#f2542d' : 'none'}
        stroke={active ? '#f2542d' : '#f4f6fb'}
        strokeWidth={2}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
      </svg>
    </motion.button>
  );
}
