import type { Task } from "@taskmanager/shared-types";
import { TaskCard } from "./TaskCard";

interface TaskListProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({ tasks, onOpen, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center text-sm text-slate-600">Keine Aufgaben</div>;
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}
