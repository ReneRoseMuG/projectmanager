import type { Task, TaskStatus } from "@taskmanager/shared-types";
import { closestCorners, DndContext, type DragEndEvent } from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus, position: number) => Promise<void>;
}

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "Offen" },
  { status: "in_progress", label: "In Arbeit" },
  { status: "done", label: "Erledigt" }
];

function positionFor(targetTasks: Task[], activeTask: Task, overId: string | number): number {
  const ordered = targetTasks.filter((task) => task.id !== activeTask.id).sort((left, right) => left.position - right.position);
  if (typeof overId === "string" && overId.startsWith("column-")) {
    return (ordered.at(-1)?.position ?? 0) + 1024;
  }

  const overTaskId = Number(overId);
  const overIndex = ordered.findIndex((task) => task.id === overTaskId);
  if (overIndex < 0) {
    return (ordered.at(-1)?.position ?? 0) + 1024;
  }

  const overTask = ordered[overIndex];
  if (!overTask) {
    return (ordered.at(-1)?.position ?? 0) + 1024;
  }

  const previous = ordered[overIndex - 1]?.position ?? overTask.position - 1024;
  const next = overTask.position;
  return (previous + next) / 2;
}

export function KanbanBoard({ tasks, onOpen, onDelete, onMove }: KanbanBoardProps) {
  const grouped = columns.map((column) => ({
    ...column,
    tasks: tasks.filter((task) => task.status === column.status).sort((left, right) => left.position - right.position)
  }));

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over) {
      return;
    }

    const activeTask = tasks.find((task) => task.id === Number(event.active.id));
    if (!activeTask) {
      return;
    }

    const overId = event.over.id;
    const targetStatus =
      typeof overId === "string" && overId.startsWith("column-")
        ? (overId.replace("column-", "") as TaskStatus)
        : tasks.find((task) => task.id === Number(overId))?.status ?? activeTask.status;

    const targetTasks = tasks.filter((task) => task.status === targetStatus);
    await onMove(activeTask, targetStatus, positionFor(targetTasks, activeTask, overId));
  };

  if (tasks.length === 0) {
    return <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-600">Keine Aufgaben</div>;
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 lg:grid-cols-3">
        {grouped.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={column.tasks}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
