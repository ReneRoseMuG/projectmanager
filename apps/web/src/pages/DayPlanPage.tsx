import type { CalendarEvent, EventInput, Priority, TaskBoardItem, TaskStatus } from "@taskmanager/shared-types";
import { addDays, format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Link2Off, ListPlus, Plus, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { DatePicker } from "../components/ui/DatePicker";
import { FormField } from "../components/ui/FormField";
import { Input } from "../components/ui/Input";
import { PageHero } from "../components/ui/PageHero";
import { PrioritySelect } from "../components/ui/PrioritySelect";
import { Spinner } from "../components/ui/Spinner";
import { StatusPill } from "../components/ui/StatusPill";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCatalogs } from "../hooks/useCatalogs";
import { useDayPlan } from "../hooks/useDayPlan";
import { catalogColor, catalogLabel, isCatalogStatusClosed, resolveCatalogEntryKey } from "../utils/catalogs";
import { formatHumanDate, fromDateTimeLocalInput } from "../utils/date";

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function todayKey(): string {
  return toDateKey(new Date());
}

function dayLabel(date: string): string {
  return format(parseISO(date), "EEEE, dd.MM.yy", { locale: de });
}

function dateTimeValue(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00`;
}

function shiftDate(date: string, amount: number): string {
  return toDateKey(addDays(parseISO(date), amount));
}

function timeLabel(event: CalendarEvent): string {
  if (event.isAllDay) {
    return "Ganztägig";
  }
  return `${format(parseISO(event.startTime), "HH:mm")} - ${format(parseISO(event.endTime), "HH:mm")}`;
}

function ownerLabel(event: CalendarEvent): string {
  if (event.owners.length === 0) {
    return "Ohne Kontext";
  }
  const labels: Record<string, string> = {
    dayPlan: "Tagesplan",
    project: "Projekt",
    milestone: "Meilenstein",
    task: "Aufgabe"
  };
  return event.owners.map((owner) => `${labels[owner.type] ?? owner.type} #${owner.id}`).join(", ");
}

function taskNextStatus(task: TaskBoardItem, entries: ReturnType<typeof useCatalogs>["entries"]): TaskStatus {
  if (isCatalogStatusClosed(entries, "workStatus", task.status)) {
    return (resolveCatalogEntryKey(entries, "workStatus", "active", "active") ?? "active") as TaskStatus;
  }
  return (resolveCatalogEntryKey(entries, "workStatus", "completed", "completed") ?? "completed") as TaskStatus;
}

function TaskItem({
  task,
  onToggle,
  onUnlink
}: {
  task: TaskBoardItem;
  onToggle: (task: TaskBoardItem) => Promise<void>;
  onUnlink: (taskId: number) => Promise<void>;
}) {
  const catalogs = useCatalogs();
  const closed = isCatalogStatusClosed(catalogs.entries, "workStatus", task.status);
  const priorityColor = catalogColor(catalogs.entries, "priority", task.priority);

  return (
    <article className="rounded-md border border-line bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`break-words text-sm font-semibold ${closed ? "text-steel-500 line-through" : "text-ink"}`}>{task.title}</h2>
          {task.description ? <p className="mt-1 line-clamp-2 text-sm text-steel-600">{task.description}</p> : null}
        </div>
        <Button size="sm" variant="ghost" icon={<Link2Off size={15} />} title="Aus Tagesplan lösen" aria-label="Aufgabe aus Tagesplan lösen" onClick={() => void onUnlink(task.id)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill kind="workStatus" value={task.status} />
        <span className="inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-semibold" style={{ borderColor: priorityColor, color: priorityColor, backgroundColor: `${priorityColor}14` }}>
          {catalogLabel(catalogs.entries, "priority", task.priority)}
        </span>
        {task.dueDate ? <span className="text-xs font-semibold text-steel-500">Fällig {formatHumanDate(task.dueDate)}</span> : null}
      </div>
      <div className="mt-3">
        <Button size="sm" variant={closed ? "secondary" : "primary"} icon={<CheckCircle2 size={15} />} onClick={() => void onToggle(task)}>
          {closed ? "Wieder öffnen" : "Erledigt"}
        </Button>
      </div>
    </article>
  );
}

function EventItem({ event, onUnlink }: { event: CalendarEvent; onUnlink: (eventId: number) => Promise<void> }) {
  return (
    <article className="rounded-md border border-line bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: event.color ?? "var(--color-steel-500)" }} />
            <span className="text-xs font-semibold text-steel-500">{timeLabel(event)}</span>
          </div>
          <h2 className="mt-1 break-words text-sm font-semibold text-ink">{event.title}</h2>
          {event.description ? <p className="mt-1 line-clamp-2 text-sm text-steel-600">{event.description}</p> : null}
          <p className="mt-2 text-xs font-medium text-steel-500">{ownerLabel(event)}</p>
        </div>
        <Button size="sm" variant="ghost" icon={<Link2Off size={15} />} title="Aus Tagesplan lösen" aria-label="Termin aus Tagesplan lösen" onClick={() => void onUnlink(event.id)} />
      </div>
    </article>
  );
}

export function DayPlanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = searchParams.get("date") ?? todayKey();
  const dayPlanController = useDayPlan(selectedDate);
  const { dayPlan, loading, error, createTask, updateTask, unlinkTask, createEvent, unlinkEvent, updateDayPlan } = dayPlanController;
  const catalogs = useCatalogs();
  const { showToast } = useToast();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("medium");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState(dateTimeValue(selectedDate, 9));
  const [eventEnd, setEventEnd] = useState(dateTimeValue(selectedDate, 10));
  const [eventAllDay, setEventAllDay] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setEventStart(dateTimeValue(selectedDate, 9));
    setEventEnd(dateTimeValue(selectedDate, 10));
  }, [selectedDate]);

  useEffect(() => {
    setNotesDraft(dayPlan?.notes ?? "");
  }, [dayPlan?.notes, dayPlan?.id]);

  const taskStats = useMemo(() => {
    const tasks = dayPlan?.tasks ?? [];
    const closed = tasks.filter((task) => isCatalogStatusClosed(catalogs.entries, "workStatus", task.status)).length;
    return { closed, total: tasks.length };
  }, [catalogs.entries, dayPlan?.tasks]);

  function selectDate(date: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("date", date);
    setSearchParams(nextParams, { replace: true });
  }

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
        dueDate: selectedDate
      });
      setTaskTitle("");
      showToast({ tone: "success", title: "Aufgabe im Tagesplan angelegt" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht angelegt werden", message: errorMessage(taskError) });
    }
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = eventTitle.trim();
    if (!title) {
      return;
    }
    const input: EventInput = {
      title,
      description: null,
      startTime: fromDateTimeLocalInput(eventAllDay ? dateTimeValue(selectedDate, 0) : eventStart),
      endTime: fromDateTimeLocalInput(eventAllDay ? dateTimeValue(shiftDate(selectedDate, 1), 0) : eventEnd),
      isAllDay: eventAllDay,
      color: "var(--color-teal)",
      reminderMinutes: 60,
      owners: []
    };
    try {
      await createEvent(input);
      setEventTitle("");
      showToast({ tone: "success", title: "Termin im Tagesplan angelegt" });
    } catch (eventError) {
      showToast({ tone: "error", title: "Termin konnte nicht angelegt werden", message: errorMessage(eventError) });
    }
  }

  async function saveNotes() {
    if (!dayPlan) {
      return;
    }
    setSavingNotes(true);
    try {
      await updateDayPlan({ notes: notesDraft.trim() || null, expectedVersion: dayPlan.version });
      showToast({ tone: "success", title: "Tagesnotizen gespeichert" });
    } catch (notesError) {
      showToast({ tone: "error", title: "Tagesnotizen konnten nicht gespeichert werden", message: errorMessage(notesError) });
    } finally {
      setSavingNotes(false);
    }
  }

  async function toggleDayStatus() {
    if (!dayPlan) {
      return;
    }
    try {
      await updateDayPlan({
        status: dayPlan.status === "completed" ? "open" : "completed",
        expectedVersion: dayPlan.version
      });
      showToast({ tone: "success", title: dayPlan.status === "completed" ? "Tagesplan wieder geöffnet" : "Tagesplan abgeschlossen" });
    } catch (statusError) {
      showToast({ tone: "error", title: "Tagesstatus konnte nicht geändert werden", message: errorMessage(statusError) });
    }
  }

  const tasks = dayPlan?.tasks ?? [];
  const events = dayPlan?.events ?? [];
  const subtitle = `${dayLabel(selectedDate)} · ${taskStats.closed}/${taskStats.total} Aufgaben erledigt · ${events.length} Termine`;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <PageHero
        variant="list"
        title="Tagesplan"
        subtitle={subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="inverted" size="sm" icon={<ChevronLeft size={16} />} onClick={() => selectDate(shiftDate(selectedDate, -1))}>
              Vorheriger Tag
            </Button>
            <Button variant="inverted" size="sm" icon={<CalendarDays size={16} />} onClick={() => selectDate(todayKey())}>
              Heute
            </Button>
            <Button variant="inverted" size="sm" icon={<ChevronRight size={16} />} onClick={() => selectDate(shiftDate(selectedDate, 1))}>
              Nächster Tag
            </Button>
          </div>
        }
      />

      <div className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-4 overflow-auto px-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-5 lg:py-5">
        <main className="grid min-h-0 gap-4">
          {error ? <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{error}</div> : null}
          <section className="rounded-md border border-line bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-end">
              <DatePicker label="Datum" value={selectedDate} onChange={(event) => selectDate(event.target.value)} />
              <div className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-steel-400">Status</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex min-h-7 items-center rounded-md border px-2.5 text-xs font-semibold ${dayPlan?.status === "completed" ? "border-fern/20 bg-fern/10 text-fern" : "border-steel-200 bg-steel-100 text-steel-700"}`}>
                    {dayPlan?.status === "completed" ? "Abgeschlossen" : "Offen"}
                  </span>
                  {loading ? <Spinner size="sm" /> : null}
                </div>
              </div>
              <Button variant={dayPlan?.status === "completed" ? "secondary" : "primary"} icon={<CheckCircle2 size={16} />} disabled={!dayPlan} onClick={() => void toggleDayStatus()}>
                {dayPlan?.status === "completed" ? "Wieder öffnen" : "Abschließen"}
              </Button>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Aufgaben</h2>
                  <p className="text-sm text-steel-500">{taskStats.total === 0 ? "Keine Tagesaufgaben" : `${taskStats.closed} von ${taskStats.total} erledigt`}</p>
                </div>
                <ListPlus size={18} className="text-steel-400" />
              </div>
              <form className="grid gap-3" onSubmit={(event) => void submitTask(event)}>
                <FormField label="Neue Aufgabe" required>
                  <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Aufgabe für diesen Tag" />
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
              <div className="grid gap-3">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
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
                        showToast({ tone: "success", title: "Aufgabe aus Tagesplan gelöst" });
                      } catch (taskError) {
                        showToast({ tone: "error", title: "Aufgabe konnte nicht gelöst werden", message: errorMessage(taskError) });
                      }
                    }}
                  />
                ))}
                {!loading && tasks.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-sm text-steel-500">Noch keine Aufgaben für diesen Tag.</p> : null}
              </div>
            </div>

            <div className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">Termine</h2>
                  <p className="text-sm text-steel-500">{events.length === 0 ? "Keine Tagestermine" : `${events.length} Termine`}</p>
                </div>
                <Clock3 size={18} className="text-steel-400" />
              </div>
              <form className="grid gap-3" onSubmit={(event) => void submitEvent(event)}>
                <FormField label="Neuer Termin" required>
                  <Input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Termin für diesen Tag" />
                </FormField>
                <label className="flex items-center gap-2 text-sm font-medium text-steel-700">
                  <input type="checkbox" checked={eventAllDay} onChange={(event) => setEventAllDay(event.target.checked)} />
                  Ganztägig
                </label>
                {!eventAllDay ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DatePicker label="Start" mode="datetime-local" value={eventStart} onChange={(event) => setEventStart(event.target.value)} />
                    <DatePicker label="Ende" mode="datetime-local" value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} />
                  </div>
                ) : null}
                <Button type="submit" variant="primary" icon={<Plus size={16} />} disabled={!eventTitle.trim()}>
                  Hinzufügen
                </Button>
              </form>
              <div className="grid gap-3">
                {events.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onUnlink={async (eventId) => {
                      try {
                        await unlinkEvent(eventId);
                        showToast({ tone: "success", title: "Termin aus Tagesplan gelöst" });
                      } catch (eventError) {
                        showToast({ tone: "error", title: "Termin konnte nicht gelöst werden", message: errorMessage(eventError) });
                      }
                    }}
                  />
                ))}
                {!loading && events.length === 0 ? <p className="rounded-md border border-dashed border-line p-4 text-sm text-steel-500">Noch keine Termine für diesen Tag.</p> : null}
              </div>
            </div>
          </section>
        </main>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-line bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Tagesnotizen</h2>
                <p className="text-sm text-steel-500">Gedanken, Reihenfolge, offene Kleinigkeiten.</p>
              </div>
              <Button size="sm" variant="primary" icon={<Save size={15} />} loading={savingNotes} disabled={!dayPlan} onClick={() => void saveNotes()}>
                Speichern
              </Button>
            </div>
            <textarea
              className="min-h-72 w-full resize-y rounded-md border border-line bg-white p-3 text-sm text-ink outline-none transition placeholder:text-steel-400 focus:border-steel-600 focus:ring-2 focus:ring-steel-700/10"
              value={notesDraft}
              placeholder="Notizen zum Tag"
              onChange={(event) => setNotesDraft(event.target.value)}
            />
          </section>
          <section className="rounded-md border border-line bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Tagesüberblick</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-steel-500">Aufgaben</dt>
                <dd className="font-semibold text-ink">{taskStats.total}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-steel-500">Erledigt</dt>
                <dd className="font-semibold text-ink">{taskStats.closed}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-steel-500">Termine</dt>
                <dd className="font-semibold text-ink">{events.length}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
