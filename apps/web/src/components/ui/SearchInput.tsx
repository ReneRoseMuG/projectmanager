import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}

export function SearchInput({ value, onChange, placeholder = "Suchen", hint, maxLength = 15 }: SearchInputProps) {
  return (
    <label className="flex h-10 w-full max-w-[15rem] items-center gap-2 rounded-md bg-steel-100 px-3 text-sm text-slate-500">
      <Search className="shrink-0 text-steel-500" size={17} />
      <input
        className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-slate-400"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="rounded border border-steel-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-steel-500">{hint}</span> : null}
    </label>
  );
}
