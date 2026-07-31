interface FiltersProps {
  genres: string[];
  platforms: string[];
  selectedGenre: string | null;
  selectedPlatform: string | null;
  onGenreChange: (genre: string | null) => void;
  onPlatformChange: (platform: string | null) => void;
}

function FilterGroup({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div className="mb-6">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-steam-400">{title}</h4>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`rounded-md px-2 py-1.5 text-left text-sm ${
            selected === null ? 'bg-iron-800 text-steam-100' : 'text-steam-400 hover:text-steam-100'
          }`}
        >
          All
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`rounded-md px-2 py-1.5 text-left text-sm ${
              selected === opt ? 'bg-iron-800 text-steam-100' : 'text-steam-400 hover:text-steam-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Filters({ genres, platforms, selectedGenre, selectedPlatform, onGenreChange, onPlatformChange }: FiltersProps) {
  return (
    <aside className="w-56 shrink-0">
      <FilterGroup title="Genre" options={genres} selected={selectedGenre} onSelect={onGenreChange} />
      <FilterGroup title="Platform" options={platforms} selected={selectedPlatform} onSelect={onPlatformChange} />
    </aside>
  );
}
