import type { CalendarEvent, EventInput } from "@taskmanager/shared-types";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CalendarView } from "../components/calendar/CalendarView";
import { EventForm } from "../components/calendar/EventForm";
import { UpcomingEvents } from "../components/calendar/UpcomingEvents";
import { Button } from "../components/ui/Button";
import { CalendarSkeleton } from "../components/calendar/CalendarSkeleton";
import { useToast } from "../components/ui/ToastProvider";
import { errorMessage } from "../hooks/errors";
import { useCalendarTasks } from "../hooks/useCalendarTasks";
import { useEvents } from "../hooks/useEvents";
import { useMilestones } from "../hooks/useMilestones";
import { useProjects } from "../hooks/useProjects";

export function CalendarPage() {
  const { showToast } = useToast();
  const { projects, loading: projectsLoading } = useProjects();
  const { milestones, loading: milestonesLoading } = useMilestones();
  const calendarTasks = useCalendarTasks();
  const events = useEvents();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);

  const openCreate = (date?: string) => {
    setSelectedEvent(null);
    setInitialDate(date ?? new Date().toISOString());
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
      showToast({ tone: "error", title: "Termin konnte nicht gespeichert werden", message: errorMessage(eventError) });
      throw eventError;
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Kalender</h1>
          <p className="text-sm text-slate-600">{events.events.length} Termine</p>
        </div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate()}>
          Neuer Termin
        </Button>
      </header>

      {events.error || calendarTasks.error ? <div className="rounded-md border border-crimson bg-crimson/10 p-3 text-sm text-crimson">{events.error ?? calendarTasks.error}</div> : null}
      {events.loading || calendarTasks.loading || projectsLoading || milestonesLoading ? (
        <CalendarSkeleton />
      ) : (
        <>
          <CalendarView
            events={events.events}
            tasks={calendarTasks.tasks}
            onDateClick={openCreate}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setFormOpen(true);
            }}
            onEventMove={async (event, startTime, endTime) => {
              try {
                await events.updateEvent(event.id, { startTime, endTime, expectedVersion: event.version });
                showToast({ tone: "success", title: "Termin verschoben" });
              } catch (eventError) {
                showToast({ tone: "error", title: "Termin konnte nicht verschoben werden", message: errorMessage(eventError) });
                throw eventError;
              }
            }}
          />
          <UpcomingEvents
            events={events.events}
            onOpen={(event) => {
              setSelectedEvent(event);
              setFormOpen(true);
            }}
          />
        </>
      )}
      <EventForm
        open={formOpen}
        event={selectedEvent}
        initialDate={initialDate}
        projects={projects}
        milestones={milestones}
        tasks={calendarTasks.tasks}
        onSubmit={submit}
        onDelete={async (event) => {
          try {
            await events.removeEvent(event.id);
            setFormOpen(false);
            showToast({ tone: "success", title: "Termin gelöscht" });
          } catch (eventError) {
            showToast({ tone: "error", title: "Termin konnte nicht gelöscht werden", message: errorMessage(eventError) });
            throw eventError;
          }
        }}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
