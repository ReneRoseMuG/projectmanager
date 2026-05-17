interface DividerProps {
  label?: string;
}

/** Horizontal divider with an optional centered label. */
export function Divider({ label }: DividerProps) {
  if (!label) {
    return <hr className="border-line" />;
  }

  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      <span className="h-px flex-1 bg-line" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
