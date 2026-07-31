interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-md border border-iron-700 px-3 py-1.5 text-sm text-steam-100 disabled:opacity-40"
      >
        Prev
      </button>
      <span className="text-sm text-steam-400">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-md border border-iron-700 px-3 py-1.5 text-sm text-steam-100 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
