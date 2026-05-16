import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Suchen" }: SearchInputProps) {
  return (
    <label className="relative block w-full max-w-[360px]">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
      <input
        className="h-10 w-full rounded-md border border-line bg-white pl-10 pr-3 text-sm outline-none transition focus:border-teal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
