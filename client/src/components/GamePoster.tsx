import { getPosterTheme } from '../lib/posterArt';

interface GamePosterProps {
  title: string;
  genre?: string | null;
  seed: string;
  showText?: boolean;
}

export function GamePoster({ title, genre, seed, showText = true }: GamePosterProps) {
  const { primary, secondary, angle, shapeVariant } = getPosterTheme(seed);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-end overflow-hidden p-4"
      style={{ background: `linear-gradient(${angle}deg, ${primary}, ${secondary})` }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-15" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice">
        {shapeVariant === 0 && <circle cx="250" cy="70" r="130" fill="white" />}
        {shapeVariant === 1 && <polygon points="0,400 320,220 320,400" fill="black" />}
        {shapeVariant === 2 && (
          <rect x="30" y="30" width="240" height="340" fill="none" stroke="white" strokeWidth="6" />
        )}
        {shapeVariant === 3 && <path d="M0 110 Q150 10 300 110 L300 0 L0 0 Z" fill="white" />}
      </svg>

      {showText && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="relative">
            {genre && (
              <div className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-white/75">
                {genre}
              </div>
            )}
            <div className="font-display text-base font-bold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)] line-clamp-3">
              {title}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
