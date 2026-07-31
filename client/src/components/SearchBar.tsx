import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  onSubmitNavigate?: boolean;
}

export function SearchBar({ className = '', autoFocus, onSubmitNavigate = true }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onSubmitNavigate) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={onSubmit} className={`flex items-center gap-2 rounded-full border border-iron-700 bg-iron-900 px-4 py-2 ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="shrink-0 text-steam-400">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        placeholder="Search games…"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full bg-transparent text-sm text-steam-100 outline-none placeholder:text-steam-600"
      />
    </form>
  );
}
