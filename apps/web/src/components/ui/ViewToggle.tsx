import { Columns3, ListTodo } from "lucide-react";
import type { ViewMode } from "../../types";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

function toggleButtonClass(active: boolean): string {
  return `inline-flex h-8 w-8 items-center justify-center rounded-md border bg-transparent text-steel-700 transition hover:border-steel-400 hover:text-ink ${
    active ? "border-2 border-ink" : "border-line"
  }`;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex gap-1 rounded-md border border-line bg-transparent p-0.5">
      <button
        type="button"
        aria-label="Liste"
        title="Liste"
        className={toggleButtonClass(value === "list")}
        onClick={() => onChange("list")}
      >
        <ListTodo size={17} />
      </button>
      <button
        type="button"
        aria-label="Kanban"
        title="Kanban"
        className={toggleButtonClass(value === "kanban")}
        onClick={() => onChange("kanban")}
      >
        <Columns3 size={17} />
      </button>
    </div>
  );
}
