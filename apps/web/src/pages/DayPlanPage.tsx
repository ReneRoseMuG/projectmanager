import type { Note, TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Activity, CalendarDays, LayoutDashboard, ListPlus, MessageSquare, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CommentThread } from "../components/ui/CommentThread";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHero } from "../components/ui/PageHero";
import { Spinner } from "../components/ui/Spinner";
import { TabBar, type Tab } from "../components/ui/TabBar";
import { useToast } from "../components/ui/ToastProvider";
import { DashboardView } from "../components/dashboard/DashboardView";
import { DayPlanCalendarWidget } from "../components/dashboard/DashboardWidgets";
import { JournalPanel } from "../components/journal/JournalPanel";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteList } from "../components/notes/NoteList";
import { TaskForm, type TaskFormInput } from "../components/tasks/TaskForm";
import { TaskListBoardView } from "../components/tasks/TaskListBoardView";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useDayPlan, useDayPlanTasks } from "../hooks/useDayPlan";
import { useEntityComments } from "../hooks/useEntityComments";
import { useNotes } from "../hooks/useNotes";
import { useHasPermission } from "../hooks/usePermissions";
import { useViewMode } from "../hooks/useViewMode";
import { resolveCatalogEntryKey } from "../utils/catalogs";
import { withStandaloneView } from "../utils/standalone";

type DayPlanTab = "overview" | "calendar" | "tasks" | "notes" | "comments" | "journal";

const tabs: Array<Tab<DayPlanTab>> = [
  { value: "overview", label: "Übersicht", icon: <LayoutDashboard size={16} /> },
  { value: "calendar", label: "Kalender", icon: <CalendarDays size={16} /> },
  { value: "tasks", label: "Aufgaben", icon: <ListPlus size={16} /> },
  { value: "notes", label: "Notizen", icon: <StickyNote size={16} /> },
  { value: "comments", label: "Kommentare", icon: <MessageSquare size={16} /> },
  { value: "journal", label: "Journal", icon: <Activity size={16} /> },
];

function todayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function todayLabel(): string {
  return format(new Date(), "EEEE, dd.MM.yy", { locale: de });
}

function DayPlanTasks({
  dayPlanDate,
  tasks,
  loading,
  createTask,
  unlinkTask,
  updateTask,
}: {
  dayPlanDate: string;
  tasks: TaskBoardItem[];
  loading: boolean;
  createTask: ReturnType<typeof useDayPlan>["createTask"];
  unlinkTask: (taskId: number) => Promise<void>;
  updateTask: ReturnType<typeof useDayPlan>["updateTask"];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const catalogs = useCatalogs();
  const { showToast } = useToast();
  const { viewMode, setViewMode } = useViewMode();
  const canWritePlan = useHasPermission("dayPlans", "write");
  const canDeletePlan = useHasPermission("dayPlans", "delete");
  const canWriteTasks = useHasPermission("tasks", "write");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState<TaskStatus>((resolveCatalogEntryKey(catalogs.entries, "workStatus", "active", "active") ?? "active") as TaskStatus);
  const returnTo = `${location.pathname}${location.search}`;

  function openTaskForm(status?: TaskStatus) {
    setInitialStatus((resolveCatalogEntryKey(catalogs.entries, "workStatus", status ?? "active", "active") ?? "active") as TaskStatus);
    setTaskFormOpen(true);
  }

  async function submitTask(input: TaskFormInput) {
    try {
      await createTask({
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        responsibleUserId: input.responsibleUserId,
        dueDate: input.dueDate ?? dayPlanDate,
      });
      showToast({ tone: "success", title: "Aufgabe angelegt" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht angelegt werden", message: errorMessage(taskError) });
      throw taskError;
    }
  }

  async function updateTaskStatus(task: TaskBoardItem, status: TaskStatus) {
    try {
      await updateTask(task.id, { status, expectedVersion: task.version });
      showToast({ tone: "success", title: "Aufgabe aktualisiert" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht aktualisiert werden", message: errorMessage(taskError) });
      throw taskError;
    }
  }

  async function updateTaskDueDate(task: TaskBoardItem, dueDate: string | null) {
    try {
      await updateTask(task.id, { dueDate, expectedVersion: task.version });
      showToast({ tone: "success", title: "Aufgabendatum aktualisiert" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabendatum konnte nicht aktualisiert werden", message: errorMessage(taskError) });
      throw taskError;
    }
  }

  async function unlink(task: TaskBoardItem) {
    try {
      await unlinkTask(task.id);
      showToast({ tone: "success", title: "Aufgabe gelöst" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht gelöst werden", message: errorMessage(taskError) });
      throw taskError;
    }
  }

  return (
    <>
      <TaskListBoardView
        boardId="dayplan-tasks"
        tasks={tasks}
        loading={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAdd={() => openTaskForm()}
        onAddStatus={(status) => openTaskForm(status)}
        onOpen={(task) => navigate(`/tasks/${task.id}?returnTo=${encodeURIComponent(returnTo)}`)}
        onOpenInTab={(task) => window.open(withStandaloneView(`/tasks/${task.id}`), "_blank")}
        onDelete={(task) => unlink(task as TaskBoardItem)}
        onStatusChange={canWriteTasks ? (task, status) => updateTaskStatus(task as TaskBoardItem, status) : undefined}
        onDueDateChange={canWriteTasks ? (task, dueDate) => updateTaskDueDate(task as TaskBoardItem, dueDate) : undefined}
        showCreateActions={canWritePlan && canWriteTasks}
        canDelete={canDeletePlan}
      />
      <TaskForm open={taskFormOpen} initialStatus={initialStatus} onSubmit={submitTask} onClose={() => setTaskFormOpen(false)} />
    </>
  );
}

function DayPlanNotes({ dayPlanId }: { dayPlanId: number }) {
  const notes = useNotes({ type: "dayPlan", id: dayPlanId });
  const { showToast } = useToast();
  const canWriteNotes = useHasPermission("notes", "write");
  const canDeleteNotes = useHasPermission("notes", "delete");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  async function createNote() {
    try {
      const created = await notes.createNote({ title: "Neue Notiz", contentJson: {} });
      if (created) {
        setEditingNote(created);
      }
      showToast({ tone: "success", title: "Notiz angelegt" });
    } catch (noteError) {
      showToast({ tone: "error", title: "Notiz konnte nicht angelegt werden", message: errorMessage(noteError) });
    }
  }

  return (
    <>
      {notes.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{notes.error}</div> : null}
      <NoteList
        notes={notes.notes}
        owner={{ type: "dayPlan", id: dayPlanId }}
        canCreate={canWriteNotes}
        canDelete={canDeleteNotes}
        onCreate={createNote}
        onEdit={setEditingNote}
        onDelete={(note) => {
          void notes
            .removeNote(note.id)
            .then(() => showToast({ tone: "success", title: "Notiz aus Persönlicher Planung gelöst" }))
            .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht gelöst werden", message: errorMessage(noteError) }));
        }}
      />
      <NoteEditor
        note={editingNote}
        open={editingNote !== null}
        onClose={() => setEditingNote(null)}
        onSave={async (id, input) => {
          const updated = await notes.updateNote(id, input);
          if (updated) {
            setEditingNote(updated);
          }
        }}
      />
    </>
  );
}

function DayPlanComments({ dayPlanId }: { dayPlanId: number }) {
  const comments = useEntityComments("dayPlan", dayPlanId);

  return (
    <>
      {comments.error ? <div className="rounded-md border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">{comments.error}</div> : null}
      <CommentThread comments={comments.comments} entityLabel="persönlichen Plan" onCreate={comments.createComment} onUpdate={comments.updateComment} onDelete={comments.removeComment} />
    </>
  );
}

export function DayPlanPage() {
  const date = todayKey();
  const dayPlanController = useDayPlan(date);
  const { dayPlan, loading, error, createTask, updateTask } = dayPlanController;
  const dayPlanTasks = useDayPlanTasks();
  const [activeTab, setActiveTab] = useState<DayPlanTab>("overview");

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.value === "tasks") {
          return { ...tab, count: dayPlanTasks.tasks.length };
        }
        return tab;
      }),
    [dayPlanTasks.tasks.length],
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Persönliche Planung" subtitle={todayLabel()} />
      <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

      {activeTab === "calendar" && dayPlan ? (
        <div className="min-h-0 flex-1 p-4 lg:p-5">
          <DayPlanCalendarWidget owner={{ type: "dayPlan", id: dayPlan.id }} dayPlanDate={date} />
        </div>
      ) : (
        <main className="min-h-0 flex-1 overflow-auto px-4 py-4 lg:px-5 lg:py-5">
          {error ? <div className="mb-4 rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{error}</div> : null}
          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Spinner />
            </div>
          ) : dayPlan ? (
            <div className="grid gap-4">
              {activeTab === "overview" ? <DashboardView context="dayPlan" owner={{ type: "dayPlan", id: dayPlan.id }} dayPlanDate={date} hideInlineHeader /> : null}
              {activeTab === "tasks" ? (
                <DayPlanTasks
                  dayPlanDate={date}
                  tasks={dayPlanTasks.tasks}
                  loading={dayPlanTasks.loading}
                  createTask={createTask}
                  unlinkTask={dayPlanTasks.unlinkTask}
                  updateTask={updateTask}
                />
              ) : null}
              {activeTab === "notes" ? <DayPlanNotes dayPlanId={dayPlan.id} /> : null}
              {activeTab === "comments" ? <DayPlanComments dayPlanId={dayPlan.id} /> : null}
              {activeTab === "journal" ? <JournalPanel objectType="dayPlan" objectId={dayPlan.id} /> : null}
            </div>
          ) : (
            <EmptyState icon={<LayoutDashboard size={22} />} title="Persönliche Planung konnte nicht geladen werden" variant="tinted" tone="tangerine" />
          )}
        </main>
      )}
    </div>
  );
}
