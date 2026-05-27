import type {
  DashboardOwner,
  DashboardContext,
  DashboardWidgetLayout,
  JournalEntry,
  JournalListResponse,
  Milestone,
  Project,
  RecentAttachment,
  RecentComment,
  Task,
  TaskStats,
  Ticket,
  TicketStats,
} from "@taskmanager/shared-types";
import { AlertTriangle, ExternalLink, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import { useEvents } from "../../hooks/useEvents";
import { useDashboardWidgetData } from "../../hooks/useDashboards";
import { useHasPermission } from "../../hooks/usePermissions";
import { catalogColor, catalogLabel } from "../../utils/catalogs";
import { formatHumanDate } from "../../utils/date";
import { CalendarSkeleton } from "../calendar/CalendarSkeleton";
import { useOptionalCalendarDashboard } from "../calendar/CalendarDashboardProvider";
import { CalendarView } from "../calendar/CalendarView";
import { UpcomingEvents } from "../calendar/UpcomingEvents";
import { WeekCalendar } from "../calendar/WeekCalendar";
import { MilestoneListBoardView } from "../milestones/MilestoneListBoardView";
import { ProjectListBoardView } from "../projects/ProjectListBoardView";
import { TaskListBoardView } from "../tasks/TaskListBoardView";
import { TicketListBoardView } from "../tickets/TicketListBoardView";
import { EmptyState } from "../ui/EmptyState";
import { PriorityBadge } from "../ui/PriorityBadge";
import { ProgressBar } from "../ui/ProgressBar";
import { Skeleton } from "../ui/Skeleton";
import { StatusPill } from "../ui/StatusPill";
import { TicketTypeBadge } from "../ui/TicketTypeBadge";
import { useCatalogs } from "../../hooks/useCatalogs";
import { dashboardWidgetRegistry } from "./widgetRegistry";

interface DashboardWidgetCardProps {
  widget: DashboardWidgetLayout;
  owner?: DashboardOwner;
  context?: DashboardContext;
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
  return "/";
}

function dashboardDetailPath(type: string, id: number, returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  return `${dashboardPath(type, id)}?${params.toString()}`;
}

function WidgetShell({
  widget,
  children,
}: {
  widget: DashboardWidgetLayout;
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
          <p className="line-clamp-2 text-xs text-steel-600">{comment.body}</p>
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

function CalendarWidget() {
  const canReadEvents = useHasPermission("events", "read");
  const canReadTasks = useHasPermission("tasks", "read");
  const events = useEvents(undefined, canReadEvents);
  const calendarTasks = useCalendarTasks(canReadTasks);

  if (events.loading || calendarTasks.loading) {
    return <CalendarSkeleton />;
  }

  return (
    <CalendarView
      events={canReadEvents ? events.events : []}
      tasks={canReadTasks ? calendarTasks.tasks : []}
      compact
    />
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
    <WeekCalendar
      events={calendar.events}
      tasks={calendar.tasks}
      projects={calendar.projects}
      milestones={calendar.milestones}
      onDateClick={calendar.canWriteEvents ? calendar.openCreate : undefined}
      onEventClick={calendar.canWriteEvents ? calendar.openEvent : undefined}
      onEventMove={calendar.canWriteEvents ? calendar.moveEvent : undefined}
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
}: {
  tasks: Task[] | undefined;
  mode: "kanban" | "list";
  onOpen: (task: Task) => void;
}) {
  return (
    <TaskListBoardView
      tasks={tasks ?? []}
      viewMode={mode}
      onViewModeChange={() => undefined}
      onAdd={() => undefined}
      onOpen={onOpen}
      onDelete={() => undefined}
      readOnly
    />
  );
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
      onDelete={() => undefined}
      readOnly
    />
  );
}

export function DashboardWidgetCard({ widget, owner, context }: DashboardWidgetCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const usesOwnData = widget.widgetId === "calendar" || widget.widgetId === "upcomingEvents";
  const query = useDashboardWidgetData(widget, owner, !usesOwnData);
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

    return (
      <WidgetShell widget={widget}>
        <CalendarWidget />
      </WidgetShell>
    );
  }

  if (widget.widgetId === "upcomingEvents") {
    return (
      <WidgetShell widget={widget}>
        <UpcomingEventsWidget />
      </WidgetShell>
    );
  }

  if (query.loading) {
    return (
      <WidgetShell widget={widget}>
        <WidgetLoading />
      </WidgetShell>
    );
  }

  if (query.error) {
    return (
      <WidgetShell widget={widget}>
        <WidgetError message={query.error} />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell widget={widget}>
      {widget.widgetId === "taskStatusReport" ? <StatusReport stats={query.data as TaskStats | undefined} kind="workStatus" /> : null}
      {widget.widgetId === "ticketStatusReport" ? <StatusReport stats={query.data as TicketStats | undefined} kind="workStatus" /> : null}
      {widget.widgetId === "taskJournal" ? <TaskRows tasks={query.data as Task[] | undefined} emptyTitle="Keine Aufgaben vorhanden" /> : null}
      {widget.widgetId === "ticketJournal" ? <TicketRows tickets={query.data as Ticket[] | undefined} /> : null}
      {widget.widgetId === "globalJournal" ? <JournalRows response={query.data as JournalListResponse | undefined} /> : null}
      {widget.widgetId === "commentJournal" ? <CommentRows comments={query.data as RecentComment[] | undefined} /> : null}
      {widget.widgetId === "attachmentJournal" ? <AttachmentRows attachments={query.data as RecentAttachment[] | undefined} /> : null}
      {widget.widgetId === "milestoneProgress" ? <MilestoneRows milestones={query.data as Milestone[] | undefined} /> : null}
      {widget.widgetId === "overdueTasks" ? <TaskRows tasks={query.data as Task[] | undefined} emptyTitle="Keine überfälligen Aufgaben" /> : null}
      {widget.widgetId === "taskBoard" ? <TaskBoardWidget tasks={query.data as Task[] | undefined} mode="kanban" onOpen={(task) => navigateToDetail("task", task.id)} /> : null}
      {widget.widgetId === "taskList" ? <TaskBoardWidget tasks={query.data as Task[] | undefined} mode="list" onOpen={(task) => navigateToDetail("task", task.id)} /> : null}
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
