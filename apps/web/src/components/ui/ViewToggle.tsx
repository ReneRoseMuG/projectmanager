import { Columns3, ListTodo } from "lucide-react";
import type { ViewMode } from "../../types";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

function toggleButtonClass(active: boolean): string {
  return `inline-flex h-8 w-8 items-center justify-center rounded-md border transition hover:border-steel-500 hover:text-ink ${
    active ? "border-steel-900 bg-steel-900 text-white shadow-sm hover:border-steel-900 hover:bg-steel-800 hover:text-white" : "border-line bg-white text-steel-700"
  }`;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-line bg-steel-100 p-1">
      <button
        type="button"
        aria-label="Liste"
        title="Liste"
        className={toggleButtonClass(value === "list")}
        onClick={() => onChange("list")}
      >
        <ListTodo size={18} strokeWidth={2.3} />
      </button>
      <button
        type="button"
        aria-label="Kanban"
        title="Kanban"
        className={toggleButtonClass(value === "kanban")}
        onClick={() => onChange("kanban")}
      >
        <Columns3 size={18} strokeWidth={2.3} />
      </button>
    </div>
  );
}
