import type { Task, TaskStatus } from "@taskmanager/shared-types";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function KanbanColumn({ status, label, tasks, onOpen, onDelete }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: `column-${status}` });

  return (
    <section ref={setNodeRef} className="grid min-h-[360px] content-start gap-3 rounded-lg border border-line bg-shell p-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{label}</h2>
        <span className="rounded bg-white px-2 py-1 text-xs text-slate-600">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableTaskCard key={task.id} task={task} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </SortableContext>
    </section>
  );
}

function SortableTaskCard({ task, onOpen, onDelete }: { task: Task; onOpen: (task: Task) => void; onDelete: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} compact onOpen={onOpen} onDelete={onDelete} />
    </div>
  );
}
