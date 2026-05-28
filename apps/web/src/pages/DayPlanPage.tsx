import type { Note, Priority, TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Activity, CheckCircle2, LayoutDashboard, Link2Off, ListPlus, MessageSquare, Plus, StickyNote } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { CommentThread } from "../components/ui/CommentThread";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { PageHero } from "../components/ui/PageHero";
import { PriorityBadge } from "../components/ui/PriorityBadge";
import { PrioritySelect } from "../components/ui/PrioritySelect";
import { Spinner } from "../components/ui/Spinner";
import { StatusPill } from "../components/ui/StatusPill";
import { TabBar, type Tab } from "../components/ui/TabBar";
import { useToast } from "../components/ui/ToastProvider";
import { DashboardView } from "../components/dashboard/DashboardView";
import { JournalPanel } from "../components/journal/JournalPanel";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteList } from "../components/notes/NoteList";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useDayPlan } from "../hooks/useDayPlan";
import { useEntityComments } from "../hooks/useEntityComments";
import { useGlobalTasks } from "../hooks/useTasks";
import { useNotes } from "../hooks/useNotes";
import { useHasPermission } from "../hooks/usePermissions";
import { isCatalogStatusClosed, resolveCatalogEntryKey } from "../utils/catalogs";
import { formatHumanDate } from "../utils/date";

type DayPlanTab = "overview" | "tasks" | "notes" | "comments" | "journal";

const tabs: Array<Tab<DayPlanTab>> = [
  { value: "overview", label: "Übersicht", icon: <LayoutDashboard size={16} /> },
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

function taskNextStatus(task: TaskBoardItem, entries: ReturnType<typeof useCatalogs>["entries"]): TaskStatus {
  if (isCatalogStatusClosed(entries, "workStatus", task.status)) {
    return (resolveCatalogEntryKey(entries, "workStatus", "active", "active") ?? "active") as TaskStatus;
  }
  return (resolveCatalogEntryKey(entries, "workStatus", "completed", "completed") ?? "completed") as TaskStatus;
}

function TaskItem({
  task,
  canUpdate,
  canUnlink,
  onToggle,
  onUnlink,
}: {
  task: TaskBoardItem;
  canUpdate: boolean;
  canUnlink: boolean;
  onToggle: (task: TaskBoardItem) => Promise<void>;
  onUnlink: (taskId: number) => Promise<void>;
}) {
  const catalogs = useCatalogs();
  const closed = isCatalogStatusClosed(catalogs.entries, "workStatus", task.status);

  return (
    <article className="rounded-md border border-line bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`break-words text-sm font-semibold ${closed ? "text-steel-500 line-through" : "text-ink"}`}>{task.title}</h2>
          {task.description ? <p className="mt-1 line-clamp-2 text-sm text-steel-600">{task.description}</p> : null}
        </div>
        {canUnlink ? (
          <Button size="sm" variant="ghost" icon={<Link2Off size={15} />} title="Aus Persönlicher Planung lösen" aria-label="Aufgabe aus Persönlicher Planung lösen" onClick={() => void onUnlink(task.id)} />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill kind="workStatus" value={task.status} />
        <PriorityBadge value={task.priority} />
        {task.dueDate ? <span className="text-xs font-semibold text-steel-500">Fällig {formatHumanDate(task.dueDate)}</span> : null}
      </div>
      {canUpdate ? (
        <div className="mt-3">
          <Button size="sm" variant={closed ? "secondary" : "primary"} icon={<CheckCircle2 size={15} />} onClick={() => void onToggle(task)}>
            {closed ? "Wieder öffnen" : "Erledigt"}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function DayPlanTasks({
  dayPlanDate,
  tasks,
  loading,
  createTask,
  linkTask,
  unlinkTask,
  updateTask,
}: {
  dayPlanDate: string;
  tasks: TaskBoardItem[];
  loading: boolean;
  createTask: ReturnType<typeof useDayPlan>["createTask"];
  linkTask: ReturnType<typeof useDayPlan>["linkTask"];
  unlinkTask: ReturnType<typeof useDayPlan>["unlinkTask"];
  updateTask: ReturnType<typeof useDayPlan>["updateTask"];
}) {
  const catalogs = useCatalogs();
  const globalTasks = useGlobalTasks();
  const { showToast } = useToast();
  const canWritePlan = useHasPermission("dayPlans", "write");
  const canDeletePlan = useHasPermission("dayPlans", "delete");
  const canWriteTasks = useHasPermission("tasks", "write");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const linkedTaskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  const candidates = useMemo(
    () =>
      globalTasks.tasks.filter(
        (task) => task.parentId === null && !linkedTaskIds.has(task.id) && !isCatalogStatusClosed(catalogs.entries, "workStatus", task.status),
      ),
    [catalogs.entries, globalTasks.tasks, linkedTaskIds],
  );

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) {
      return;
    }
    try {
      await createTask({
        title,
        description: null,
        status: (resolveCatalogEntryKey(catalogs.entries, "workStatus", "active", "active") ?? "active") as TaskStatus,
        priority: taskPriority,
        dueDate: dayPlanDate,
      });
      setTaskTitle("");
      showToast({ tone: "success", title: "Aufgabe angelegt" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht angelegt werden", message: errorMessage(taskError) });
    }
  }

  async function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedTaskId === null) {
      return;
    }
    try {
      await linkTask(selectedTaskId);
      setSelectedTaskId(null);
      showToast({ tone: "success", title: "Aufgabe verknüpft" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht verknüpft werden", message: errorMessage(taskError) });
    }
  }

  return (
    <div className="grid gap-4">
      {canWritePlan ? (
        <section className="grid gap-4 rounded-md border border-line bg-white p-4 shadow-sm lg:grid-cols-2">
          <form className="grid gap-3" onSubmit={(event) => void submitTask(event)}>
            <FormField label="Neue Aufgabe" required>
              <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Aufgabe für die persönliche Planung" />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <FormField label="Priorität">
                <PrioritySelect value={taskPriority} onChange={setTaskPriority} />
              </FormField>
              <Button type="submit" variant="primary" icon={<Plus size={16} />} disabled={!taskTitle.trim()}>
                Hinzufügen
              </Button>
            </div>
          </form>
          <form className="grid gap-3" onSubmit={(event) => void submitLink(event)}>
            <FormField label="Bestehende Aufgabe">
              <select
                className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
                value={selectedTaskId ?? ""}
                onChange={(event) => setSelectedTaskId(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Aufgabe auswählen</option>
                {candidates.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" icon={<ListPlus size={16} />} disabled={selectedTaskId === null || globalTasks.loading}>
                Verknüpfen
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            canUpdate={canWriteTasks}
            canUnlink={canDeletePlan}
            onToggle={async (target) => {
              try {
                await updateTask(target.id, { status: taskNextStatus(target, catalogs.entries), expectedVersion: target.version });
                showToast({ tone: "success", title: "Aufgabe aktualisiert" });
              } catch (taskError) {
                showToast({ tone: "error", title: "Aufgabe konnte nicht aktualisiert werden", message: errorMessage(taskError) });
              }
            }}
            onUnlink={async (taskId) => {
              try {
                await unlinkTask(taskId);
                showToast({ tone: "success", title: "Aufgabe gelöst" });
              } catch (taskError) {
                showToast({ tone: "error", title: "Aufgabe konnte nicht gelöst werden", message: errorMessage(taskError) });
              }
            }}
          />
        ))}
        {!loading && tasks.length === 0 ? (
          <EmptyState icon={<ListPlus size={22} />} title="Keine Aufgaben" body="Aufgaben für die persönliche Planung erscheinen hier." variant="tinted" />
        ) : null}
      </section>
    </div>
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
  const { dayPlan, loading, error, createTask, linkTask, updateTask, unlinkTask } = dayPlanController;
  const [activeTab, setActiveTab] = useState<DayPlanTab>("overview");

  const tabItems = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.value === "tasks") {
          return { ...tab, count: dayPlan?.tasks.length ?? 0 };
        }
        return tab;
      }),
    [dayPlan?.tasks.length],
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero variant="list" title="Persönliche Planung" subtitle={todayLabel()} />
      <TabBar tabs={tabItems} active={activeTab} onChange={setActiveTab} />

      <main className="min-h-0 flex-1 overflow-auto px-4 py-4 lg:px-5 lg:py-5">
        {error ? <div className="mb-4 rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{error}</div> : null}
        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Spinner />
          </div>
        ) : dayPlan ? (
          <div className="grid gap-4">
            {activeTab === "overview" ? <DashboardView context="dayPlan" owner={{ type: "dayPlan", id: dayPlan.id }} hideInlineHeader /> : null}
            {activeTab === "tasks" ? (
              <DayPlanTasks
                dayPlanDate={date}
                tasks={dayPlan.tasks}
                loading={loading}
                createTask={createTask}
                linkTask={linkTask}
                unlinkTask={unlinkTask}
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
    </div>
  );
}
