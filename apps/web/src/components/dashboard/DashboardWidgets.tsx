import type {
  CalendarEvent,
  DashboardOwner,
  DashboardContext,
  DashboardWidgetLayout,
  EventInput,
  JournalEntry,
  JournalListResponse,
  Milestone,
  Note,
  Project,
  RecentAttachment,
  RecentComment,
  Task,
  TaskStats,
  Ticket,
  TicketStats,
} from "@taskmanager/shared-types";
import { AlertTriangle, BookOpen, ExternalLink, Inbox, Library, Plus, RefreshCw, StickyNote } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import { useDayPlan, useDayPlanEvents } from "../../hooks/useDayPlan";
import { useEvents } from "../../hooks/useEvents";
import { useEntityComments } from "../../hooks/useEntityComments";
import { useDashboardWidgetData } from "../../hooks/useDashboards";
import { useHasPermission } from "../../hooks/usePermissions";
import { useNotes } from "../../hooks/useNotes";
import { errorMessage } from "../../hooks/errors";
import { catalogColor, catalogLabel } from "../../utils/catalogs";
import { withStandaloneView } from "../../utils/standalone";
import { formatHumanDate } from "../../utils/date";
import { richTextToPlainText } from "../../utils/richText";
import { EventForm } from "../calendar/EventForm";
import { CalendarSkeleton } from "../calendar/CalendarSkeleton";
import { useOptionalCalendarDashboard } from "../calendar/CalendarDashboardProvider";
import { CalendarWidgetView } from "../calendar/CalendarWidgetView";
import { UpcomingEvents } from "../calendar/UpcomingEvents";
import { MilestoneListBoardView } from "../milestones/MilestoneListBoardView";
import { ProjectListBoardView } from "../projects/ProjectListBoardView";
import { TaskForm, type TaskFormInput } from "../tasks/TaskForm";
import { TaskListBoardView } from "../tasks/TaskListBoardView";
import { TicketListBoardView } from "../tickets/TicketListBoardView";
import { Button } from "../ui/Button";
import { CommentBodyModal } from "../ui/CommentBodyModal";
import { EmptyState } from "../ui/EmptyState";
import { PriorityBadge } from "../ui/PriorityBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { Skeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { TicketTypeBadge } from "../ui/TicketTypeBadge";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useToast } from "../ui/ToastProvider";
import { NoteEditor } from "../notes/NoteEditor";
import { noteContentToPreviewText } from "../notes/noteContent";
import { dashboardWidgetRegistry } from "./widgetRegistry";
import { useAllDiaries, useDiary } from "../../hooks/useDiary";
import { useProjects } from "../../hooks/useProjects";
import { RichTextInlineField } from "../ui/rich-text-inline-field";
import { hasVisibleHtmlContent } from "../../lib/html-utils";

interface DashboardWidgetCardProps {
  widget: DashboardWidgetLayout;
  owner?: DashboardOwner;
  context?: DashboardContext;
  dayPlanDate?: string;
}

function dashboardPath(type: string, id: number): string {
  if (type === "project") {
    return `/projects/${id}`;
  }
  if (type === "milestone") {
    return `/milestones/${id}`;
  }
  if (type === "task") {
    return `/tasks/${id}`;
  }
  if (type === "ticket") {
    return `/tickets/${id}`;
  }
  if (type === "feature") {
    return `/features/${id}`;
  }
  if (type === "useCase") {
    return `/use-cases/${id}`;
  }
  if (type === "wikiPage") {
    return `/wiki/${id}`;
  }
  if (type === "backlogItem") {
    return `/backlog/${id}`;
  }
  if (type === "dayPlan") {
    return "/day-plan";
  }
  return "/";
}

function dashboardDetailPath(type: string, id: number, returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  return `${dashboardPath(type, id)}?${params.toString()}`;
}

function WidgetShell({
  widget,
  action,
  children,
}: {
  widget: DashboardWidgetLayout;
  action?: ReactNode;
  children: ReactNode;
}) {
  const meta = dashboardWidgetRegistry[widget.widgetId];
  const Icon = meta.icon;

  return (
    <section className="flex h-full min-h-48 flex-col rounded-lg border border-line bg-white p-4 shadow-sm" data-testid={`dashboard-widget-${widget.widgetId}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-steel-100 text-steel-700">
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink">{meta.label}</h3>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="min-h-0 flex-1">
        {children}
      </div>
    </section>
  );
}

function WidgetLoading() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

function WidgetError({ message }: { message: string }) {
  return (
    <EmptyState
      icon={<AlertTriangle size={20} />}
      title="Widget konnte nicht geladen werden."
      body={message}
      tone="tangerine"
      variant="tinted"
    />
  );
}

function DayPlanWidgetAction({
  widget,
  owner,
  context,
  dayPlanDate,
}: {
  widget: DashboardWidgetLayout;
  owner?: DashboardOwner;
  context?: DashboardContext;
  dayPlanDate?: string;
}) {
  const { showToast } = useToast();
  const canWriteDayPlans = useHasPermission("dayPlans", "write");
  const canWriteTasks = useHasPermission("tasks", "write");
  const canWriteNotes = useHasPermission("notes", "write");
  const canWriteComments = useHasPermission("comments", "write");
  const canWriteEvents = useHasPermission("events", "write");
  const dayPlan = useDayPlan(dayPlanDate ?? "", owner?.type === "dayPlan" && Boolean(dayPlanDate));
  const notes = useNotes(owner?.type === "dayPlan" ? owner : null);
  const comments = useEntityComments("dayPlan", owner?.type === "dayPlan" ? owner.id : null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);

  if (context !== "dayPlan" || owner?.type !== "dayPlan") {
    return null;
  }

  const createTask = widget.widgetId === "taskList" || widget.widgetId === "taskBoard";
  const createNote = widget.widgetId === "noteList";
  const createComment = widget.widgetId === "commentJournal";
  const createEvent = widget.widgetId === "upcomingEvents";
  const canCreate =
    (createTask && Boolean(dayPlanDate) && canWriteDayPlans && canWriteTasks) ||
    (createNote && canWriteNotes) ||
    (createComment && canWriteComments) ||
    (createEvent && Boolean(dayPlanDate) && canWriteDayPlans && canWriteEvents);

  if (!canCreate) {
    return null;
  }

  const openCreate = () => {
    if (createTask) {
      setTaskFormOpen(true);
      return;
    }
    if (createNote) {
      void notes
        .createNote({ title: "Neue Notiz", contentJson: {} })
        .then((note) => {
          if (note) {
            setEditingNote(note);
          }
          showToast({ tone: "success", title: "Notiz angelegt" });
        })
        .catch((noteError: unknown) => showToast({ tone: "error", title: "Notiz konnte nicht angelegt werden", message: errorMessage(noteError) }));
      return;
    }
    if (createComment) {
      setCommentModalOpen(true);
      return;
    }
    if (createEvent) {
      setEventFormOpen(true);
    }
  };

  const submitTask = async (input: TaskFormInput) => {
    try {
      await dayPlan.createTask({
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        responsibleUserId: input.responsibleUserId,
        dueDate: input.dueDate,
      });
      showToast({ tone: "success", title: "Aufgabe angelegt" });
    } catch (taskError) {
      showToast({ tone: "error", title: "Aufgabe konnte nicht angelegt werden", message: errorMessage(taskError) });
      throw taskError;
    }
  };

  const submitComment = async (body: string) => {
    try {
      await comments.createComment({ body });
      showToast({ tone: "success", title: "Kommentar angelegt" });
    } catch (commentError) {
      showToast({ tone: "error", title: "Kommentar konnte nicht angelegt werden", message: errorMessage(commentError) });
      throw commentError;
    }
  };

  const submitEvent = async (input: EventInput) => {
    try {
      await dayPlan.createEvent(input);
      showToast({ tone: "success", title: "Termin erstellt" });
    } catch (eventError) {
      showToast({ tone: "error", title: "Termin konnte nicht gespeichert werden", message: errorMessage(eventError) });
      throw eventError;
    }
  };

  return (
    <>
      <Button variant="ghost" icon={<Plus size={18} />} title="Neu anlegen" aria-label={`${dashboardWidgetRegistry[widget.widgetId].label}: neu anlegen`} onClick={openCreate} />
      <TaskForm open={taskFormOpen} onSubmit={submitTask} onClose={() => setTaskFormOpen(false)} />
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
      <CommentBodyModal
        open={commentModalOpen}
        title="Kommentar anlegen"
        breadcrumb={["Kommentare", "Anlegen"]}
        initialBody=""
        placeholder="Kommentar schreiben"
        submitLabel="Anlegen"
        testIdPrefix="day-plan-widget-comment-create"
        onSave={submitComment}
        onClose={() => setCommentModalOpen(false)}
      />
      <EventForm
        open={eventFormOpen}
        event={null}
        initialDate={dayPlanDate}
        initialOwners={[{ type: "dayPlan", id: owner.id }]}
        projects={[]}
        milestones={[]}
        tasks={[]}
        onSubmit={submitEvent}
        onDelete={async () => undefined}
        canDelete={false}
        onClose={() => setEventFormOpen(false)}
      />
    </>
  );
}

function StatusReport({ stats, kind }: { stats: TaskStats | TicketStats | undefined; kind: "workStatus" }) {
  const catalogs = useCatalogs();
  const entries = Object.entries(stats?.statusCounts ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const total = stats?.total ?? 0;

  if (total === 0) {
    return <EmptyState icon={<Inbox size={20} />} title="Keine Einträge vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-3">
      <div className="text-3xl font-bold text-ink">{total}</div>
      <div className="grid gap-3">
        {entries.map(([status, count]) => {
          const value = Math.round((count / total) * 100);
          return (
            <div key={status} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{catalogLabel(catalogs.entries, kind, status)}</span>
                <span className="text-steel-500">{count}</span>
              </div>
              <ProgressBar value={value} color={catalogColor(catalogs.entries, kind, status)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRows({ tasks, emptyTitle }: { tasks: Task[] | undefined; emptyTitle: string }) {
  if (!tasks || tasks.length === 0) {
    return <EmptyState icon={<Inbox size={20} />} title={emptyTitle} variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {tasks.map((task) => (
        <Link key={task.id} to={`/tasks/${task.id}`} className="grid gap-2 rounded-md border border-line p-3 transition hover:border-fern hover:bg-fern/5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{task.title}</span>
            <ExternalLink size={14} className="shrink-0 text-steel-400" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="workStatus" value={task.status} />
            <PriorityBadge value={task.priority} />
            {task.dueDate ? <span className="text-xs text-steel-500">Fällig {formatHumanDate(task.dueDate)}</span> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

function TicketRows({ tickets }: { tickets: Ticket[] | undefined }) {
  if (!tickets || tickets.length === 0) {
    return <EmptyState icon={<Inbox size={20} />} title="Keine Tickets vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {tickets.map((ticket) => (
        <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="grid gap-2 rounded-md border border-line p-3 transition hover:border-fern hover:bg-fern/5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{ticket.title}</span>
            <ExternalLink size={14} className="shrink-0 text-steel-400" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TicketTypeBadge value={ticket.type} />
            <StatusPill kind="workStatus" value={ticket.status} />
            <PriorityBadge value={ticket.priority} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function JournalRows({ response }: { response: JournalListResponse | undefined }) {
  const entries = response?.entries ?? [];
  if (entries.length === 0) {
    return <EmptyState icon={<Inbox size={20} />} title="Keine Journal-Einträge vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {entries.map((entry: JournalEntry) => (
        <Link key={entry.id} to={dashboardPath(entry.objectType, entry.objectId)} className="grid gap-1 rounded-md border border-line p-3 transition hover:border-fern hover:bg-fern/5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ink">{entry.objectLabel}</span>
            <span className="shrink-0 text-xs text-steel-500">{formatHumanDate(entry.createdAt)}</span>
          </div>
          <p className="line-clamp-2 text-xs text-steel-600">{entry.summary}</p>
          <p className="text-xs text-steel-400">{entry.actorName}</p>
        </Link>
      ))}
    </div>
  );
}

function CommentRows({ comments }: { comments: RecentComment[] | undefined }) {
  if (!comments || comments.length === 0) {
    return <EmptyState icon={<Inbox size={20} />} title="Keine Kommentare vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {comments.map((comment) => (
        <Link key={comment.id} to={dashboardPath(comment.entityType, comment.entityId)} className="grid gap-1 rounded-md border border-line p-3 transition hover:border-fern hover:bg-fern/5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ink">{comment.entityLabel}</span>
            <span className="shrink-0 text-xs text-steel-500">{formatHumanDate(comment.updatedAt)}</span>
          </div>
          <p className="line-clamp-2 text-xs text-steel-600">{richTextToPlainText(comment.body)}</p>
          <p className="text-xs text-steel-400">{comment.authorName}</p>
        </Link>
      ))}
    </div>
  );
}

function AttachmentRows({ attachments }: { attachments: RecentAttachment[] | undefined }) {
  if (!attachments || attachments.length === 0) {
    return <EmptyState icon={<Inbox size={20} />} title="Keine Dateien vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {attachments.map((attachment) => (
        <Link key={attachment.id} to={dashboardPath(attachment.entityType, attachment.entityId)} className="grid gap-1 rounded-md border border-line p-3 transition hover:border-fern hover:bg-fern/5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-ink">{attachment.filename}</span>
            <span className="shrink-0 text-xs text-steel-500">{formatHumanDate(attachment.createdAt)}</span>
          </div>
          <p className="text-xs text-steel-500">{attachment.entityLabel}</p>
          <p className="text-xs text-steel-400">{attachment.authorName}</p>
        </Link>
      ))}
    </div>
  );
}

function NoteRows({ notes }: { notes: Note[] | undefined }) {
  if (!notes || notes.length === 0) {
    return <EmptyState icon={<StickyNote size={20} />} title="Keine Notizen vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {notes.map((note) => {
        const preview = noteContentToPreviewText(note.contentJson);
        return (
          <div key={note.id} className="grid gap-1 rounded-md border border-line p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-ink">{note.title}</span>
              <span className="shrink-0 text-xs text-steel-500">{formatHumanDate(note.updatedAt)}</span>
            </div>
            <p className="line-clamp-2 text-xs text-steel-600">{preview || "Kein Inhalt"}</p>
          </div>
        );
      })}
    </div>
  );
}

function MilestoneRows({ milestones }: { milestones: Milestone[] | undefined }) {
  if (!milestones || milestones.length === 0) {
    return <EmptyState icon={<Inbox size={20} />} title="Keine Meilensteine vorhanden" variant="tinted" />;
  }

  return (
    <div className="grid gap-2">
      {milestones.map((milestone) => {
        const total = milestone.totalTaskCount || milestone.taskCount || 0;
        const progress = total > 0 ? Math.round((milestone.doneTaskCount / total) * 100) : 0;
        return (
          <Link key={milestone.id} to={`/milestones/${milestone.id}`} className="grid gap-2 rounded-md border border-line p-3 transition hover:border-fern hover:bg-fern/5">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold text-ink">{milestone.name}</span>
              <StatusPill kind="workStatus" value={milestone.status} />
            </div>
            <ProgressBar value={progress} label={`${milestone.doneTaskCount}/${total} Aufgaben erledigt`} />
            <div className="flex flex-wrap gap-3 text-xs text-steel-500">
              <span>{milestone.openTaskCount} offen</span>
              <span>{milestone.ticketCount} Tickets</span>
              {milestone.dueDate ? <span>Fällig {formatHumanDate(milestone.dueDate)}</span> : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CalendarWidget({ owner, context, dayPlanDate }: { owner?: DashboardOwner; context?: DashboardContext; dayPlanDate?: string }) {
  const canReadEvents = useHasPermission("events", "read");
  const canWriteEvents = useHasPermission("events", "write");
  const canDeleteEvents = useHasPermission("events", "delete");
  const canReadTasks = useHasPermission("tasks", "read");
  const canWriteDayPlans = useHasPermission("dayPlans", "write");
  const events = useEvents(undefined, canReadEvents);
  const isDayPlanCalendar = owner?.type === "dayPlan" && (context === "dayPlan" || context === "dayPlanCalendar");
  const dayPlan = useDayPlan(dayPlanDate ?? "", isDayPlanCalendar && Boolean(dayPlanDate));
  const dayPlanEventsQuery = useDayPlanEvents(canReadEvents && isDayPlanCalendar);
  const calendarTasks = useCalendarTasks(canReadTasks && !isDayPlanCalendar);
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  if (events.loading || calendarTasks.loading || dayPlanEventsQuery.loading) {
    return <CalendarSkeleton />;
  }

  const interactive = canWriteEvents && (!isDayPlanCalendar || (Boolean(dayPlanDate) && canWriteDayPlans));

  const handleDateClick = interactive
    ? (date: string) => {
        setSelectedEvent(null);
        setFormDate(date);
        setFormOpen(true);
      }
    : undefined;

  const handleEventClick = interactive
    ? (event: CalendarEvent) => {
        setSelectedEvent(event);
        setFormDate(null);
        setFormOpen(true);
      }
    : undefined;

  const handleSubmit = async (input: EventInput, eventId?: number) => {
    try {
      if (eventId !== undefined && selectedEvent) {
        await events.updateEvent(eventId, { ...input, expectedVersion: selectedEvent.version });
        showToast({ tone: "success", title: "Termin aktualisiert" });
      } else if (isDayPlanCalendar) {
        await dayPlan.createEvent(input);
        showToast({ tone: "success", title: "Termin erstellt" });
      } else {
        await events.createEvent(input);
        showToast({ tone: "success", title: "Termin erstellt" });
      }
    } catch (err) {
      showToast({ tone: "error", title: "Termin konnte nicht gespeichert werden", message: errorMessage(err) });
      throw err;
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    try {
      await events.removeEvent(event.id);
      setFormOpen(false);
      showToast({ tone: "success", title: "Termin gelöscht" });
    } catch (err) {
      showToast({ tone: "error", title: "Termin konnte nicht gelöscht werden", message: errorMessage(err) });
      throw err;
    }
  };

  return (
    <>
      <CalendarWidgetView
        events={canReadEvents ? (isDayPlanCalendar ? dayPlanEventsQuery.events : events.events) : []}
        tasks={canReadTasks && !isDayPlanCalendar ? calendarTasks.tasks : []}
        compact
        mode={interactive ? "interactive" : "readonly"}
        onDateClick={handleDateClick}
        onEventClick={interactive ? handleEventClick : undefined}
      />
      {interactive ? (
        <EventForm
          open={formOpen}
          event={selectedEvent}
          initialDate={formDate}
          initialOwners={!selectedEvent && isDayPlanCalendar && owner?.type === "dayPlan" ? [{ type: "dayPlan", id: owner.id }] : undefined}
          projects={[]}
          milestones={[]}
          tasks={[]}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          canDelete={canDeleteEvents}
          onClose={() => {
            setFormOpen(false);
            setSelectedEvent(null);
          }}
        />
      ) : null}
    </>
  );
}

export function DayPlanCalendarWidget({ owner, dayPlanDate }: { owner: { type: "dayPlan"; id: number }; dayPlanDate?: string }) {
  const canReadEvents = useHasPermission("events", "read");
  const canWriteEvents = useHasPermission("events", "write");
  const canDeleteEvents = useHasPermission("events", "delete");
  const canWriteDayPlans = useHasPermission("dayPlans", "write");
  const events = useEvents(undefined, canReadEvents);
  const dayPlanEventsQuery = useDayPlanEvents(canReadEvents);
  const dayPlan = useDayPlan(dayPlanDate ?? "", Boolean(dayPlanDate));
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  if (events.loading || dayPlanEventsQuery.loading) {
    return <CalendarSkeleton />;
  }

  const interactive = canWriteEvents && Boolean(dayPlanDate) && canWriteDayPlans;
  const dayPlanEvents = canReadEvents ? dayPlanEventsQuery.events : [];

  const handleDateClick = interactive
    ? (date: string) => {
        setSelectedEvent(null);
        setFormDate(date);
        setFormOpen(true);
      }
    : undefined;

  const handleEventClick = interactive
    ? (event: CalendarEvent) => {
        setSelectedEvent(event);
        setFormDate(null);
        setFormOpen(true);
      }
    : undefined;

  const handleEventMove = interactive
    ? async (event: CalendarEvent, startTime: string, endTime: string) => {
        try {
          await events.updateEvent(event.id, { startTime, endTime, expectedVersion: event.version });
          showToast({ tone: "success", title: "Termin verschoben" });
        } catch (err) {
          showToast({ tone: "error", title: "Termin konnte nicht verschoben werden", message: errorMessage(err) });
          throw err;
        }
      }
    : undefined;

  const handleSubmit = async (input: EventInput, eventId?: number) => {
    try {
      if (eventId !== undefined && selectedEvent) {
        await events.updateEvent(eventId, { ...input, expectedVersion: selectedEvent.version });
        showToast({ tone: "success", title: "Termin aktualisiert" });
      } else {
        await dayPlan.createEvent(input);
        showToast({ tone: "success", title: "Termin erstellt" });
      }
    } catch (err) {
      showToast({ tone: "error", title: "Termin konnte nicht gespeichert werden", message: errorMessage(err) });
      throw err;
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    try {
      await events.removeEvent(event.id);
      setFormOpen(false);
      showToast({ tone: "success", title: "Termin gelöscht" });
    } catch (err) {
      showToast({ tone: "error", title: "Termin konnte nicht gelöscht werden", message: errorMessage(err) });
      throw err;
    }
  };

  return (
    <>
      <CalendarWidgetView
        events={dayPlanEvents}
        tasks={[]}
        mode={interactive ? "interactive" : "readonly"}
        initialView="week"
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
        onEventMove={handleEventMove}
      />
      {interactive ? (
        <EventForm
          open={formOpen}
          event={selectedEvent}
          initialDate={formDate}
          initialOwners={selectedEvent ? undefined : [{ type: "dayPlan", id: owner.id }]}
          projects={[]}
          milestones={[]}
          tasks={[]}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          canDelete={canDeleteEvents}
          onClose={() => {
            setFormOpen(false);
            setSelectedEvent(null);
          }}
        />
      ) : null}
    </>
  );
}

function InteractiveCalendarWidget() {
  const calendar = useOptionalCalendarDashboard();

  if (!calendar) {
    return <WidgetError message="Kalenderdaten sind nicht verfügbar." />;
  }

  if (calendar.loading) {
    return <CalendarSkeleton />;
  }

  if (calendar.error) {
    return <WidgetError message={calendar.error} />;
  }

  return (
    <CalendarWidgetView
      events={calendar.events}
      tasks={calendar.tasks}
      projects={calendar.projects}
      milestones={calendar.milestones}
      mode="interactive"
      onDateClick={calendar.canWriteEvents ? calendar.openCreate : undefined}
      onEventClick={calendar.canWriteEvents ? calendar.openEvent : undefined}
      onEventMove={calendar.canWriteEvents ? calendar.moveEvent : undefined}
      onTaskClick={calendar.canWriteTasks ? calendar.openTask : undefined}
      onTaskMove={calendar.canWriteTasks ? calendar.moveTask : undefined}
    />
  );
}

function UpcomingEventsWidget() {
  const canReadEvents = useHasPermission("events", "read");
  const events = useEvents(undefined, canReadEvents);

  if (events.loading) {
    return <WidgetLoading />;
  }

  return <UpcomingEvents events={canReadEvents ? events.events : []} />;
}

function TaskBoardWidget({
  tasks,
  mode,
  onOpen,
  onStatusChange,
}: {
  tasks: Task[] | undefined;
  mode: "kanban" | "list";
  onOpen: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task["status"]) => void | Promise<unknown>;
}) {
  return (
    <TaskListBoardView
      tasks={tasks ?? []}
      viewMode={mode}
      onViewModeChange={() => undefined}
      onAdd={() => undefined}
      onOpen={onOpen}
      onDelete={() => undefined}
      onStatusChange={onStatusChange}
      readOnly
    />
  );
}

/** Day-Plan-Variante des Aufgaben-Widgets: erlaubt den Statuswechsel direkt auf der Karte. */
function DayPlanTaskBoardWidget({
  tasks,
  mode,
  dayPlanDate,
  onOpen,
}: {
  tasks: Task[] | undefined;
  mode: "kanban" | "list";
  dayPlanDate?: string;
  onOpen: (task: Task) => void;
}) {
  const { showToast } = useToast();
  const canWriteTasks = useHasPermission("tasks", "write");
  const canWriteDayPlans = useHasPermission("dayPlans", "write");
  const dayPlan = useDayPlan(dayPlanDate ?? "", Boolean(dayPlanDate));
  const canEditStatus = canWriteTasks && canWriteDayPlans && Boolean(dayPlanDate);

  const handleStatusChange = canEditStatus
    ? async (task: Task, status: Task["status"]) => {
        try {
          await dayPlan.updateTask(task.id, { status, expectedVersion: task.version });
          showToast({ tone: "success", title: "Aufgabe aktualisiert" });
        } catch (taskError) {
          showToast({ tone: "error", title: "Aufgabe konnte nicht aktualisiert werden", message: errorMessage(taskError) });
          throw taskError;
        }
      }
    : undefined;

  return <TaskBoardWidget tasks={tasks} mode={mode} onOpen={onOpen} onStatusChange={handleStatusChange} />;
}

function TicketBoardWidget({
  tickets,
  mode,
  onOpen,
}: {
  tickets: Ticket[] | undefined;
  mode: "kanban" | "list";
  onOpen: (ticket: Ticket) => void;
}) {
  return (
    <TicketListBoardView
      tickets={tickets ?? []}
      viewMode={mode}
      onViewModeChange={() => undefined}
      onAdd={() => undefined}
      onOpen={onOpen}
      onDelete={() => undefined}
      readOnly
    />
  );
}

function MilestoneBoardWidget({
  milestones,
  mode,
  onOpen,
}: {
  milestones: Milestone[] | undefined;
  mode: "kanban" | "list";
  onOpen: (milestone: Milestone) => void;
}) {
  return (
    <MilestoneListBoardView
      milestones={milestones ?? []}
      viewMode={mode}
      onCreate={() => undefined}
      onEdit={onOpen}
      onOpenInTab={(milestone) => window.open(withStandaloneView(`/milestones/${milestone.id}`), "_blank")}
      onDelete={() => undefined}
      readOnly
    />
  );
}

function ProjectBoardWidget({
  projects,
  mode,
  onOpen,
}: {
  projects: Project[] | undefined;
  mode: "board" | "list";
  onOpen: (project: Project) => void;
}) {
  return (
    <ProjectListBoardView
      projects={projects ?? []}
      viewMode={mode}
      onCreate={() => undefined}
      onEdit={onOpen}
      onOpenInTab={(project) => window.open(withStandaloneView(`/projects/${project.id}`), "_blank")}
      onDelete={() => undefined}
      readOnly
    />
  );
}

// Tagebuch-Widget: zeigt die fortlaufende Projekt-Erzählung (FT(16)/MS-70). Reine Leseschicht;
// die Texte erzeugt der Cowork-Skill über die MCP-Tools. "Aktualisieren" lädt nur neu.
function DiaryWidget({ widget, owner }: { widget: DashboardWidgetLayout; owner?: DashboardOwner }) {
  const projectId = owner?.type === "project" ? owner.id : undefined;
  const canRead = useHasPermission("diary", "read");
  const { diary, loading, error, reload } = useDiary(projectId, canRead);

  const action = canRead ? (
    <Button variant="ghost" icon={<RefreshCw size={16} />} title="Aktualisieren" aria-label="Tagebuch aktualisieren" onClick={() => void reload()} />
  ) : undefined;

  return (
    <WidgetShell widget={widget} action={action}>
      {!canRead ? (
        <EmptyState icon={<BookOpen size={20} />} title="Kein Zugriff" body="Für das Tagebuch fehlt die Leseberechtigung." variant="tinted" />
      ) : loading ? (
        <WidgetLoading />
      ) : error ? (
        <WidgetError message={error} />
      ) : diary && hasVisibleHtmlContent(diary.content) ? (
        <div className="h-full overflow-y-auto">
          <RichTextInlineField value={diary.content} valueFormat="html" readOnly onChange={() => undefined} testIdPrefix="project-diary" />
        </div>
      ) : (
        <EmptyState icon={<BookOpen size={20} />} title="Kein Tagebuch vorhanden" body="Für dieses Projekt wurde noch kein Tagebuch geschrieben." variant="tinted" />
      )}
    </WidgetShell>
  );
}

const DIARY_OVERVIEW_STORAGE_KEY = "dashboard:diaryOverview:selected";

// Startseiten-Widget: zeigt Projekt-Tagebücher. Über den Selektor im Kopf entweder ein
// gewähltes Projekt oder alle Projekte gestapelt. Reine Leseschicht (FT(16)/MS-70).
function DiaryOverviewWidget({ widget }: { widget: DashboardWidgetLayout }) {
  const canRead = useHasPermission("diary", "read");
  const { projects } = useProjects();
  const [selected, setSelected] = useState<string>(() => window.localStorage.getItem(DIARY_OVERVIEW_STORAGE_KEY) ?? "all");

  const allMode = selected === "all";
  const selectedProjectId = allMode ? undefined : Number(selected);
  const all = useAllDiaries(canRead && allMode);
  const single = useDiary(selectedProjectId, canRead && !allMode);

  const handleSelect = (value: string) => {
    setSelected(value);
    window.localStorage.setItem(DIARY_OVERVIEW_STORAGE_KEY, value);
  };

  const projectName = (id: number) => projects.find((project) => project.id === id)?.name ?? `Projekt ${id}`;
  const reload = allMode ? all.reload : single.reload;

  const action = canRead ? (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(event) => handleSelect(event.target.value)}
        aria-label="Projekt auswählen"
        className="h-8 w-40 rounded-md border border-line bg-white px-2 text-sm text-ink outline-none transition focus:border-steel-600"
      >
        <option value="all">Alle Projekte</option>
        {projects.map((project) => (
          <option key={project.id} value={String(project.id)}>
            {project.name}
          </option>
        ))}
      </select>
      <Button variant="ghost" icon={<RefreshCw size={16} />} title="Aktualisieren" aria-label="Tagebücher aktualisieren" onClick={() => void reload()} />
    </div>
  ) : undefined;

  let body: ReactNode;
  if (!canRead) {
    body = <EmptyState icon={<Library size={20} />} title="Kein Zugriff" body="Für die Tagebücher fehlt die Leseberechtigung." variant="tinted" />;
  } else if (allMode) {
    const withContent = all.diaries.filter((entry) => hasVisibleHtmlContent(entry.content));
    if (all.loading) {
      body = <WidgetLoading />;
    } else if (all.error) {
      body = <WidgetError message={all.error} />;
    } else if (withContent.length === 0) {
      body = <EmptyState icon={<Library size={20} />} title="Keine Tagebücher vorhanden" body="Für noch kein Projekt wurde ein Tagebuch geschrieben." variant="tinted" />;
    } else {
      body = (
        <div className="flex h-full flex-col gap-4 overflow-y-auto">
          {withContent.map((entry) => (
            <div key={entry.id}>
              <h4 className="mb-1 text-sm font-semibold text-ink">{projectName(entry.projectId)}</h4>
              <RichTextInlineField value={entry.content} valueFormat="html" readOnly onChange={() => undefined} testIdPrefix={`diary-overview-${entry.projectId}`} />
            </div>
          ))}
        </div>
      );
    }
  } else if (single.loading) {
    body = <WidgetLoading />;
  } else if (single.error) {
    body = <WidgetError message={single.error} />;
  } else if (single.diary && hasVisibleHtmlContent(single.diary.content)) {
    body = (
      <div className="h-full overflow-y-auto">
        <RichTextInlineField value={single.diary.content} valueFormat="html" readOnly onChange={() => undefined} testIdPrefix="diary-overview-single" />
      </div>
    );
  } else {
    body = <EmptyState icon={<Library size={20} />} title="Kein Tagebuch vorhanden" body="Für dieses Projekt wurde noch kein Tagebuch geschrieben." variant="tinted" />;
  }

  return (
    <WidgetShell widget={widget} action={action}>
      {body}
    </WidgetShell>
  );
}

export function DashboardWidgetCard({ widget, owner, context, dayPlanDate }: DashboardWidgetCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const usesOwnData = widget.widgetId === "calendar" || widget.widgetId === "upcomingEvents" || widget.widgetId === "projectDiary" || widget.widgetId === "diaryOverview";
  const query = useDashboardWidgetData(widget, owner, !usesOwnData);
  const isDayPlanContext = context === "dayPlan" && owner?.type === "dayPlan";
  const dayPlanAction = isDayPlanContext ? <DayPlanWidgetAction widget={widget} owner={owner} context={context} dayPlanDate={dayPlanDate} /> : undefined;
  const navigateToDetail = (type: "task" | "ticket" | "milestone" | "project", id: number) => {
    navigate(dashboardDetailPath(type, id, returnTo));
  };

  if (widget.widgetId === "calendar") {
    if (context === "calendar") {
      return (
        <section className="h-full" data-testid={`dashboard-widget-${widget.widgetId}`}>
          <InteractiveCalendarWidget />
        </section>
      );
    }

    if (context === "dayPlanCalendar" && owner?.type === "dayPlan") {
      return (
        <section className="h-full" data-testid={`dashboard-widget-${widget.widgetId}`}>
          <DayPlanCalendarWidget owner={{ type: "dayPlan", id: owner.id }} dayPlanDate={dayPlanDate} />
        </section>
      );
    }

    return (
      <WidgetShell widget={widget} action={dayPlanAction}>
        <CalendarWidget owner={owner} context={context} dayPlanDate={dayPlanDate} />
      </WidgetShell>
    );
  }

  if (widget.widgetId === "upcomingEvents") {
    return (
      <WidgetShell widget={widget} action={dayPlanAction}>
        <UpcomingEventsWidget />
      </WidgetShell>
    );
  }

  if (widget.widgetId === "projectDiary") {
    return <DiaryWidget widget={widget} owner={owner} />;
  }

  if (widget.widgetId === "diaryOverview") {
    return <DiaryOverviewWidget widget={widget} />;
  }

  if (query.loading) {
    return (
      <WidgetShell widget={widget} action={dayPlanAction}>
        <WidgetLoading />
      </WidgetShell>
    );
  }

  if (query.error) {
    return (
      <WidgetShell widget={widget} action={dayPlanAction}>
        <WidgetError message={query.error} />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell widget={widget} action={dayPlanAction}>
      {widget.widgetId === "taskStatusReport" ? <StatusReport stats={query.data as TaskStats | undefined} kind="workStatus" /> : null}
      {widget.widgetId === "ticketStatusReport" ? <StatusReport stats={query.data as TicketStats | undefined} kind="workStatus" /> : null}
      {widget.widgetId === "taskJournal" ? <TaskRows tasks={query.data as Task[] | undefined} emptyTitle="Keine Aufgaben vorhanden" /> : null}
      {widget.widgetId === "ticketJournal" ? <TicketRows tickets={query.data as Ticket[] | undefined} /> : null}
      {widget.widgetId === "globalJournal" ? <JournalRows response={query.data as JournalListResponse | undefined} /> : null}
      {widget.widgetId === "commentJournal" ? <CommentRows comments={query.data as RecentComment[] | undefined} /> : null}
      {widget.widgetId === "noteList" ? <NoteRows notes={query.data as Note[] | undefined} /> : null}
      {widget.widgetId === "attachmentJournal" ? <AttachmentRows attachments={query.data as RecentAttachment[] | undefined} /> : null}
      {widget.widgetId === "milestoneProgress" ? <MilestoneRows milestones={query.data as Milestone[] | undefined} /> : null}
      {widget.widgetId === "overdueTasks" ? <TaskRows tasks={query.data as Task[] | undefined} emptyTitle="Keine überfälligen Aufgaben" /> : null}
      {widget.widgetId === "taskBoard" ? (
        isDayPlanContext ? (
          <DayPlanTaskBoardWidget tasks={query.data as Task[] | undefined} mode="kanban" dayPlanDate={dayPlanDate} onOpen={(task) => navigateToDetail("task", task.id)} />
        ) : (
          <TaskBoardWidget tasks={query.data as Task[] | undefined} mode="kanban" onOpen={(task) => navigateToDetail("task", task.id)} />
        )
      ) : null}
      {widget.widgetId === "taskList" ? (
        isDayPlanContext ? (
          <DayPlanTaskBoardWidget tasks={query.data as Task[] | undefined} mode="list" dayPlanDate={dayPlanDate} onOpen={(task) => navigateToDetail("task", task.id)} />
        ) : (
          <TaskBoardWidget tasks={query.data as Task[] | undefined} mode="list" onOpen={(task) => navigateToDetail("task", task.id)} />
        )
      ) : null}
      {widget.widgetId === "ticketBoard" ? <TicketBoardWidget tickets={query.data as Ticket[] | undefined} mode="kanban" onOpen={(ticket) => navigateToDetail("ticket", ticket.id)} /> : null}
      {widget.widgetId === "ticketList" ? <TicketBoardWidget tickets={query.data as Ticket[] | undefined} mode="list" onOpen={(ticket) => navigateToDetail("ticket", ticket.id)} /> : null}
      {widget.widgetId === "milestoneBoard" ? <MilestoneBoardWidget milestones={query.data as Milestone[] | undefined} mode="kanban" onOpen={(milestone) => navigateToDetail("milestone", milestone.id)} /> : null}
      {widget.widgetId === "milestoneList" ? <MilestoneBoardWidget milestones={query.data as Milestone[] | undefined} mode="list" onOpen={(milestone) => navigateToDetail("milestone", milestone.id)} /> : null}
      {widget.widgetId === "milestoneListView" ? <MilestoneBoardWidget milestones={query.data as Milestone[] | undefined} mode="list" onOpen={(milestone) => navigateToDetail("milestone", milestone.id)} /> : null}
      {widget.widgetId === "projectBoard" ? <ProjectBoardWidget projects={query.data as Project[] | undefined} mode="board" onOpen={(project) => navigateToDetail("project", project.id)} /> : null}
      {widget.widgetId === "projectList" ? <ProjectBoardWidget projects={query.data as Project[] | undefined} mode="list" onOpen={(project) => navigateToDetail("project", project.id)} /> : null}
    </WidgetShell>
  );
}
