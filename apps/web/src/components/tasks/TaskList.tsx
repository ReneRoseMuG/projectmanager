import type { Task } from "@taskmanager/shared-types";
import { ListTodo } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { TaskCard } from "./TaskCard";

interface TaskListProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskList({ tasks, onOpen, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <EmptyState icon={<ListTodo size={22} />} title="Keine Aufgaben" body="Für diesen Kontext sind noch keine Aufgaben vorhanden." tone="fern" variant="tinted" />;
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} variant="row" onOpen={onOpen} onDelete={onDelete} />
      ))}
    </div>
  );
}
