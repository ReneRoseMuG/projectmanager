import type { ReactNode } from "react";

export interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface TabBarProps<T extends string> {
  tabs: Array<Tab<T>>;
  active: T;
  onChange: (tab: T) => void;
}

/** Horizontally scrollable tab bar with optional counts and icons. */
export function TabBar<T extends string>({ tabs, active, onChange }: TabBarProps<T>) {
  return (
    <nav className="relative z-10 flex min-h-12 shrink-0 gap-1 overflow-x-auto border-b border-line bg-white px-4 md:px-5">
      {tabs.map((tab) => {
        const selected = active === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition ${selected ? "border-steel-700 text-steel-700" : "border-transparent text-slate-500 hover:text-ink"}`}
            onClick={() => onChange(tab.value)}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" ? <span className={`rounded-full px-2 py-0.5 text-xs ${selected ? "bg-steel-700 text-white" : "bg-shell text-slate-500"}`}>{tab.count}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}
