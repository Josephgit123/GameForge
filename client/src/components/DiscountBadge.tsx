interface DiscountBadgeProps {
  percentOff: number;
}

export function DiscountBadge({ percentOff }: DiscountBadgeProps) {
  if (percentOff <= 0) return null;
  return (
    <span className="inline-flex items-center rounded-md bg-success px-2 py-1 text-xs font-bold text-iron-900">
      -{Math.round(percentOff)}%
    </span>
  );
}
