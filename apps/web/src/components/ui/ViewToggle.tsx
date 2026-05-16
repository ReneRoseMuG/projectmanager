import { Columns3, ListTodo } from "lucide-react";
import type { ViewMode } from "../../types";
import { Button } from "./Button";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border border-line bg-white p-1">
      <Button
        aria-label="Liste"
        title="Liste"
        icon={<ListTodo size={17} />}
        variant={value === "list" ? "primary" : "ghost"}
        className="h-8 w-8"
        onClick={() => onChange("list")}
      />
      <Button
        aria-label="Kanban"
        title="Kanban"
        icon={<Columns3 size={17} />}
        variant={value === "kanban" ? "primary" : "ghost"}
        className="h-8 w-8"
        onClick={() => onChange("kanban")}
      />
    </div>
  );
}
