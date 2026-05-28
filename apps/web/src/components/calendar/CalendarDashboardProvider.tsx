import type { CalendarEvent, EventInput, Milestone, Project, Task } from "@taskmanager/shared-types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { errorMessage } from "../../hooks/errors";
import { useCalendarTasks } from "../../hooks/useCalendarTasks";
import { useEvents } from "../../hooks/useEvents";
import { useMilestones } from "../../hooks/useMilestones";
import { useHasPermission } from "../../hooks/usePermissions";
import { useProjects } from "../../hooks/useProjects";
import { EventForm } from "./EventForm";
import { useToast } from "../ui/ToastProvider";

interface CalendarDashboardContextValue {
  events: CalendarEvent[];
  tasks: Task[];
  projects: Project[];
  milestones: Milestone[];
  loading: boolean;
  error: string | null;
  canWriteEvents: boolean;
  canReadTasks: boolean;
  canWriteTasks: boolean;
  openCreate: (date?: string) => void;
  openEvent: (event: CalendarEvent) => void;
  moveEvent: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
  moveTask: (task: Task, dueDate: string) => Promise<void>;
}

const CalendarDashboardContext = createContext<CalendarDashboardContextValue | null>(null);

export function useOptionalCalendarDashboard(): CalendarDashboardContextValue | null {
  return useContext(CalendarDashboardContext);
}

export function useCalendarDashboard(): CalendarDashboardContextValue {
  const value = useOptionalCalendarDashboard();
  if (!value) {
    throw new Error("CalendarDashboardProvider is missing");
  }
  return value;
}

export function CalendarDashboardProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWriteEvents = useHasPermission("events", "write");
  const canDeleteEvents = useHasPermission("events", "delete");
  const canReadTasks = useHasPermission("tasks", "read");
  const canWriteTasks = useHasPermission("tasks", "write");
  const projectController = useProjects();
  const { projects, loading: projectsLoading, error: projectsError } = projectController;
  const milestoneController = useMilestones();
  const { milestones, loading: milestonesLoading, error: milestonesError } = milestoneController;
  const calendarTasks = useCalendarTasks(canReadTasks);
  const events = useEvents();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);

  useEffect(() => {
    if (events.loading) {
      return;
    }
    const eventId = Number(searchParams.get("eventId"));
    if (!Number.isInteger(eventId) || eventId < 1) {
      return;
    }
    const event = events.events.find((candidate) => candidate.id === eventId);
    if (event && canWriteEvents) {
      setSelectedEvent(event);
      setFormOpen(true);
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("eventId");
    setSearchParams(nextSearchParams, { replace: true });
  }, [canWriteEvents, events.events, events.loading, searchParams, setSearchParams]);

  const openCreate = (date?: string) => {
    if (!canWriteEvents) {
      return;
    }
    setSelectedEvent(null);
    setInitialDate(date ?? new Date().toISOString());
    setFormOpen(true);
  };

  const openEvent = (event: CalendarEvent) => {
    if (!canWriteEvents) {
      return;
    }
    setSelectedEvent(event);
    setFormOpen(true);
  };

  const submit = async (input: EventInput, eventId?: number) => {
    try {
      if (eventId) {
        const expectedVersion = selectedEvent?.id === eventId ? selectedEvent.version : undefined;
        if (!expectedVersion) {
          throw new Error("Event version is missing");
        }
        await events.updateEvent(eventId, { ...input, expectedVersion });
        showToast({ tone: "success", title: "Termin aktualisiert" });
        return;
      }
      await events.createEvent(input);
      showToast({ tone: "success", title: "Termin erstellt" });
    } catch (eventError) {
      showToast({
        tone: "error",
        title: "Termin konnte nicht gespeichert werden",
        message: errorMessage(eventError)
      });
      throw eventError;
    }
  };

  const moveEvent = async (event: CalendarEvent, startTime: string, endTime: string) => {
    if (!canWriteEvents) {
      return;
    }
    try {
      await events.updateEvent(event.id, {
        startTime,
        endTime,
        expectedVersion: event.version
      });
      showToast({ tone: "success", title: "Termin verschoben" });
    } catch (eventError) {
      showToast({
        tone: "error",
        title: "Termin konnte nicht verschoben werden",
        message: errorMessage(eventError)
      });
      throw eventError;
    }
  };

  const moveTask = async (task: Task, dueDate: string) => {
    if (!canWriteTasks) {
      return;
    }
    try {
      await calendarTasks.updateTask(task.id, {
        dueDate,
        expectedVersion: task.version
      });
      showToast({ tone: "success", title: "Aufgabe verschoben" });
    } catch (taskError) {
      showToast({
        tone: "error",
        title: "Aufgabe konnte nicht verschoben werden",
        message: errorMessage(taskError)
      });
      throw taskError;
    }
  };

  const removeEvent = async (event: CalendarEvent) => {
    try {
      await events.removeEvent(event.id);
      setFormOpen(false);
      showToast({ tone: "success", title: "Termin gelöscht" });
    } catch (eventError) {
      showToast({
        tone: "error",
        title: "Termin konnte nicht gelöscht werden",
        message: errorMessage(eventError)
      });
      throw eventError;
    }
  };

  const value: CalendarDashboardContextValue = {
    events: events.events,
    tasks: canReadTasks ? calendarTasks.tasks : [],
    projects,
    milestones,
    loading: events.loading || (canReadTasks && calendarTasks.loading) || projectsLoading || milestonesLoading,
    error: events.error ?? (canReadTasks ? calendarTasks.error : null) ?? projectsError ?? milestonesError,
    canWriteEvents,
    canReadTasks,
    canWriteTasks,
    openCreate,
    openEvent,
    moveEvent,
    moveTask
  };

  return (
    <CalendarDashboardContext.Provider value={value}>
      {children}
      {canWriteEvents ? (
        <EventForm
          open={formOpen}
          event={selectedEvent}
          initialDate={initialDate}
          projects={projects}
          milestones={milestones}
          tasks={canReadTasks ? calendarTasks.tasks : []}
          onSubmit={submit}
          onDelete={removeEvent}
          canDelete={canDeleteEvents}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
    </CalendarDashboardContext.Provider>
  );
}
