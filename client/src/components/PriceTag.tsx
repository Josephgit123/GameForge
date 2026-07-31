import { formatMoney } from '../lib/money';

interface PriceTagProps {
  price: number;
  currency: string;
  originalPrice?: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
};

export function PriceTag({ price, currency, originalPrice, size = 'md' }: PriceTagProps) {
  const hasDiscount = typeof originalPrice === 'number' && originalPrice > price;

  if (price === 0) {
    return <span className={`font-mono font-semibold text-teal ${SIZE_CLASSES[size]}`}>Free</span>;
  }

  return (
    <span className="inline-flex items-baseline gap-2">
      {hasDiscount && (
        <span className="font-mono text-steam-600 line-through text-sm">{formatMoney(originalPrice, currency)}</span>
      )}
      <span className={`font-mono font-semibold text-steam-100 ${SIZE_CLASSES[size]}`}>
        {formatMoney(price, currency)}
      </span>
    </span>
  );
}
