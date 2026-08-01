import type { ReactNode } from 'react';

interface EmptyPlaceholderProps {
  title: string;
  description?: string;
  cta?: ReactNode;
  // Marks a card as showing data the backend genuinely doesn't support yet
  // (vs. a normal "nothing here yet" empty state) — dashed border instead of
  // solid, so it visually reads as "not wired up" rather than "empty".
  notAvailable?: boolean;
}

export function EmptyPlaceholder({ title, description, cta, notAvailable }: EmptyPlaceholderProps) {
  return (
    <div
      className={`rounded-2xl border p-6 text-center ${
        notAvailable ? 'border-dashed border-iron-700 bg-transparent' : 'border-iron-700 bg-iron-900'
      }`}
    >
      <div className="font-display text-sm font-semibold text-steam-100">{title}</div>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm text-steam-400">{description}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
