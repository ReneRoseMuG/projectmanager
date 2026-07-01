import type { Task, TaskUpdate } from "@taskmanager/shared-types";
import { ListTodo } from "lucide-react";
import type { ViewMode } from "../../types";
import { DetailBoardShell } from "../ui/DetailBoardShell";
import { EmptyState } from "../ui/EmptyState";
import { TaskListBoardView } from "./TaskListBoardView";

interface SubtaskListProps {
  subtasks: Task[];
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
  onCreate: (status?: Task["status"]) => void;
  onOpen: (task: Task) => void;
  onOpenInTab?: (task: Task) => void;
  onUpdate: (id: number, input: TaskUpdate) => Promise<unknown>;
  onDelete: (id: number) => Promise<void>;
  onTagsChange?: (taskId: number, tagIds: number[]) => Promise<void>;
}

export function SubtaskList({
  subtasks,
  viewMode,
  onViewModeChange,
  onCreate,
  onOpen,
  onOpenInTab,
  onUpdate,
  onDelete,
  onTagsChange,
}: SubtaskListProps) {
  return (
    <DetailBoardShell>
      <TaskListBoardView
        boardId="task-subtasks"
        tasks={subtasks}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onAdd={() => onCreate()}
        onAddStatus={(status) => onCreate(status)}
        onOpen={onOpen}
        onOpenInTab={onOpenInTab}
        onDelete={(subtask) => void onDelete(subtask.id).catch(() => undefined)}
        onStatusChange={(subtask, status) =>
          onUpdate(subtask.id, { status, expectedVersion: subtask.version })
        }
        onDueDateChange={(subtask, dueDate) =>
          onUpdate(subtask.id, { dueDate, expectedVersion: subtask.version })
        }
        onTagsChange={onTagsChange}
        addLabel="Neue Unteraufgabe"
        emptyState={
          <EmptyState
            icon={<ListTodo size={22} />}
            title="Keine Unteraufgaben"
            body="Zerlege die Aufgabe in kleinere Schritte."
            tone="fern"
            variant="default"
          />
        }
      />
    </DetailBoardShell>
  );
}
