# Codex-Auftrag: Kalender auf schlanke Wochenansicht umbauen

**Parent:** MILE-20 — Refactoring Kalender/Planungs Sichten  
**Datum:** 2026-05-27  
**Aufgaben-ID:** TASK-97

---

## Ziel

Die bestehende `CalendarView.tsx` (FullCalendar-basiert) wird durch eine vollständig
angepasste `WeekCalendar.tsx` ersetzt. Die neue Komponente zeigt ausschließlich eine
Wochenansicht (Mo–So) mit Vor-/Zurück-Navigation und Drag & Drop-Terminkacheln.
Jede Kachel zeigt ihren Kontext (Projekt / Meilenstein / Aufgabe / Tagesplan) sowie
ein User Badge im Footer. Die Implementierung folgt streng den Design-Tokens der App.

---

## Hintergrund & Kontext

Die aktuelle `CalendarView.tsx` wrapping FullCalendar hat folgende Probleme:
- Standardmäßige FullCalendar-Styles überschreiben die App-Designsprache
- Monatssicht als Default ist für die Projektplanung nicht optimal
- Terminkacheln zeigen keinen Kontext (kein Projekt/Meilenstein-Label, kein Assignee)

Ein Claude-Design-Mockup (`Wochenkalender Mockup.html`) liegt als visuelle Referenz vor.
Codex soll daraus **ausschließlich** das Kachel-Design und das Wochenraster-Layout
übernehmen — nicht die Tweaks-Panel-Logik, Lane-Modi oder die UpcomingPanel-Komponente.

### Relevante Datentypen (packages/shared-types/src/index.ts)

```typescript
// Termin — zentrale Entität
interface Event {
  id: number;
  owners: EventOwner[];      // ← Kontext-Referenzen
  title: string;
  description: string | null;
  startTime: string;         // ISO 8601
  endTime: string;           // ISO 8601
  isAllDay: boolean;
  color: string | null;      // Überschreibt Kontext-Farbe
  version: number;
}

type EventOwner = { type: "project" | "milestone" | "task"; id: number };

// Projekt & Meilenstein für Kontext-Lookup
interface Project  { id: number; name: string; color: string | null; }
interface Milestone { id: number; name: string; color: string | null; }
interface Task     { id: number; title: string; assignee: string | null; }
```

### Design-Tokens (apps/web/src/styles/theme.css)

```css
--color-ink:        #0F2542;
--color-shell:      #F4F7FA;
--color-line:       #D5DEE9;
--color-steel-700:  #2E5984;   /* Projekt-Akzent (default) */
--color-teal:       #2F8E96;   /* Termin / Meeting */
--color-violet:     #6A40BE;   /* Meilenstein */
--color-fern:       #4D9359;   /* Tagesplan */
--color-crimson:    #D9416A;   /* Ticket/Bug */
--color-tangerine:  #ED8C3A;   /* Aufgabe */
```

### Vorhandene Utilities

- **Avatar-Komponente**: `apps/web/src/components/ui/Avatar.tsx`
  - Props: `name: string | null`, `size?: "sm" | "md" | "lg"`
  - Erzeugt Initialen-Badge (Gradient violet→magenta)
- **date-fns** (v3): für ISO-Woche, Datumsarithmetik, Formatierung
- **@dnd-kit/core**: bereits installiert, Pattern aus `ListBoardView.tsx` übernehmen
  (`DndContext`, `useDraggable`, `useDroppable`, `DragOverlay`, `PointerSensor`)

---

## Aufgabe

### Schritt 1 — Neue Dateien anlegen

```
apps/web/src/components/calendar/
  WeekCalendar.tsx      ← Ersatz für CalendarView.tsx
  WeekEventTile.tsx     ← Einzelne Terminkachel
```

`CalendarView.tsx` bleibt vorerst erhalten (wird in Schritt 4 aus CalendarPage ausgehängt).

---

### Schritt 2 — WeekCalendar.tsx

#### Props-Interface

```typescript
interface WeekCalendarProps {
  events: CalendarEvent[];
  tasks: Task[];
  projects: Project[];
  milestones: Milestone[];
  onDateClick?: (date: string) => void;          // ISO-Datum des geklickten Tags
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (event: CalendarEvent, startTime: string, endTime: string) => Promise<void>;
}
```

#### Interner State

```typescript
const [weekStart, setWeekStart] = useState<Date>(() => startOfISOWeek(new Date()));
```

`startOfISOWeek` aus date-fns liefert den Montag der Woche.

#### Wochennavigation (Header)

```
← [KW 22 · 26.05. – 01.06.2026] →
```

- Zurück: `setWeekStart(subWeeks(weekStart, 1))`
- Vor: `setWeekStart(addWeeks(weekStart, 1))`
- KW-Nummer: `getISOWeek(weekStart)` aus date-fns
- Bereich-Label: `format(weekStart, "dd.MM.")` bis `format(endOfISOWeek(weekStart), "dd.MM.yyyy")`
- Die Nav-Buttons verwenden die bestehende `Button`-Komponente
  (`apps/web/src/components/ui/Button.tsx`) mit `variant="ghost"` und Lucide-Icons
  `ChevronLeft` / `ChevronRight`

#### Wochenraster

7 Spalten (Mo–So), jede Spalte ist eine Drop-Zone.

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Mo 26.05 │ Di 27.05 │ Mi 28.05 │ Do 29.05 │ Fr 30.05 │ Sa 31.05 │ So 01.06 │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ [Kachel] │          │ [Kachel] │          │ [Kachel] │          │          │
│ [Kachel] │          │          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

- Implementierung als CSS Grid: `grid-cols-7`, Tagesspalten als Flexbox-Columns
- Spalten-Header: Wochentag-Kürzel + Datum, heute-Spalte farblich hervorheben
  (`bg-steel-50 border-t-2 border-steel-700` o. ä.)
- Jede Spalte ist eine `useDroppable`-Zone mit `id = iso-Datum` (z. B. `"2026-05-27"`)
- Ein Klick auf eine leere Spalte ruft `onDateClick(isoDate)` auf

#### Ereignis-Zuweisung zu Spalten

```typescript
function eventsByDay(events: CalendarEvent[], weekStart: Date): Record<string, CalendarEvent[]> {
  // Für jeden der 7 Tage: filtere Events, deren startTime in diesem Tag liegt
  // isAllDay-Events werden am betreffenden Tag angezeigt
}
```

---

### Schritt 3 — WeekEventTile.tsx

#### Props

```typescript
interface WeekEventTileProps {
  event: CalendarEvent;
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  onClick?: () => void;
  isDragging?: boolean;
}
```

#### Kontext-Auflösung

```typescript
function resolveContext(event: CalendarEvent, projects, milestones, tasks) {
  const owner = event.owners[0];        // primärer Owner
  if (!owner) return { label: "Termin", color: "var(--color-teal)", assignee: null };

  if (owner.type === "project") {
    const p = projects.find(x => x.id === owner.id);
    return { label: p?.name ?? "Projekt", color: p?.color ?? "var(--color-steel-700)", assignee: null };
  }
  if (owner.type === "milestone") {
    const m = milestones.find(x => x.id === owner.id);
    return { label: m?.name ?? "Meilenstein", color: m?.color ?? "var(--color-violet)", assignee: null };
  }
  if (owner.type === "task") {
    const t = tasks.find(x => x.id === owner.id);
    return { label: t?.title ?? "Aufgabe", color: "var(--color-tangerine)", assignee: t?.assignee ?? null };
  }
  return { label: "Tagesplan", color: "var(--color-fern)", assignee: null };
}
```

`event.color` überschreibt die Kontext-Farbe, falls gesetzt.

#### Kachel-Layout

```
┌─────────────────────────────────────────┐
│█ Titel des Termins                      │  ← farbiger linker Rand (4px, accent-Farbe)
│  Kontext-Label (Projekt- / Meilenst.-   │  ← text-xs text-steel-500
│  oder Aufgabenname)                     │
│  09:00 – 10:30                          │  ← text-xs text-steel-400
│─────────────────────────────────────────│
│                           [AB] Avatar   │  ← Footer: Avatar-Komponente size="sm"
└─────────────────────────────────────────┘
```

CSS-Klassen (Tailwind):
```
rounded-md border border-line bg-white shadow-sm
cursor-grab active:cursor-grabbing
px-3 py-2 flex flex-col gap-0.5
```

Linker Rand: `style={{ borderLeft: "4px solid {accentColor}" }}`

Footer:
```tsx
<div className="mt-1 flex justify-end">
  {assignee && <Avatar name={assignee} size="sm" />}
</div>
```

Zeitformatierung (date-fns):
```typescript
const timeLabel = event.isAllDay
  ? "Ganztägig"
  : `${format(parseISO(event.startTime), "HH:mm")} – ${format(parseISO(event.endTime), "HH:mm")}`;
```

#### Drag & Drop

Jede Kachel ist ein `useDraggable` mit `id = String(event.id)` und `data = { event }`.
Den `DragOverlay` in `WeekCalendar.tsx` mit einer Kopie der Kachel rendern (gedimmt).

```typescript
// In WeekCalendar.tsx
const handleDragEnd = async (dragEvent: DragEndEvent) => {
  const { active, over } = dragEvent;
  if (!over) return;

  const calEvent = active.data.current?.event as CalendarEvent;
  const newDateIso = over.id as string;          // ISO-Datum der Drop-Spalte

  // Ursprüngliche Uhrzeit beibehalten, nur Datum wechseln:
  const origStart = parseISO(calEvent.startTime);
  const origEnd   = parseISO(calEvent.endTime);
  const duration  = origEnd.getTime() - origStart.getTime();

  const [year, month, day] = newDateIso.split("-").map(Number);
  const newStart = set(origStart, { year, month: month - 1, date: day });
  const newEnd   = new Date(newStart.getTime() + duration);

  await onEventMove?.(calEvent, newStart.toISOString(), newEnd.toISOString());
};
```

---

### Schritt 4 — CalendarPage.tsx anpassen

- `CalendarView` durch `WeekCalendar` ersetzen
- `projects` und `milestones` als Props übergeben (werden bereits über `useProjects()`
  und `useMilestones()` geladen)
- Import von `CalendarView` entfernen
- `CalendarView.tsx` kann anschließend gelöscht werden (FullCalendar-Deps bleiben
  zunächst in package.json, bis entschieden wird, ob sie anderswo gebraucht werden)

```tsx
// CalendarPage.tsx — Diff
- import { CalendarView } from "../components/calendar/CalendarView";
+ import { WeekCalendar } from "../components/calendar/WeekCalendar";

// Im JSX:
- <CalendarView
-   events={events.events}
-   tasks={calendarTasks.tasks}
-   onDateClick={openCreate}
-   onEventClick={...}
-   onEventMove={...}
- />
+ <WeekCalendar
+   events={events.events}
+   tasks={calendarTasks.tasks}
+   projects={projects}
+   milestones={milestones}
+   onDateClick={openCreate}
+   onEventClick={...}
+   onEventMove={...}
+ />
```

---

## Technische Leitplanken

- **Keine externen UI-Libraries** außer den bereits installierten (`@dnd-kit/core`,
  `date-fns`, Lucide Icons, Tailwind)
- **Keine FullCalendar-Imports** in den neuen Komponenten
- **Ausschließlich App-Design-Tokens** verwenden — keine Hardcoded-Hex-Werte außer
  in der Token-Tabelle (Fallbacks)
- **Bestehende UI-Komponenten** nutzen: `Avatar`, `Button`, `PageHero` (keine Duplikate)
- Das DnD-Pattern **exakt** wie in `ListBoardView.tsx` umsetzen (gleiche Sensor-Konfiguration)
- `WeekCalendar` ist eine **reine View-Komponente** — kein eigener API-Aufruf,
  alle Daten kommen als Props

---

## Regeln & Randfälle

- **isAllDay-Events**: In der Tages-Spalte ganz oben als breite Banner-Kachel
  (ohne Zeitlabel „Ganztägig")
- **Mehrere Events pro Tag**: Kacheln untereinander gestapelt, kein Overflow-Clipping
- **Event ohne Owner**: Fallback-Farbe `var(--color-teal)`, Label „Termin"
- **Tagesplan-Kontext** (`owner.type === "day_plan"`): Noch nicht in shared-types
  definiert (kommt mit dem day_plans-Feature). Falls der Typ auftaucht, Farbe
  `var(--color-fern)` und Label „Tagesplan" verwenden — ansonsten ignorieren.
- **Heutiger Tag**: Spalten-Header hervorheben (`font-bold text-steel-700`)
- **Drag auf denselben Tag**: kein API-Call (frühzeitig abbrechen wenn `over.id` ===
  `format(parseISO(calEvent.startTime), "yyyy-MM-dd")`)

---

## Seiteneffekte

- `CalendarView.tsx` wird nach erfolgreichem Test gelöscht
- `CalendarSkeleton.tsx` bleibt unverändert und wird weiter in `CalendarPage.tsx` genutzt
- `UpcomingEvents.tsx` bleibt unverändert (steht unter dem Kalender)
- `EventForm.tsx` bleibt unverändert (Dialog für Anlegen/Bearbeiten)
- Keine API-Endpunkte ändern sich

---

## Testanforderungen

**Unit-Tests** (`apps/web/src/components/calendar/WeekCalendar.test.tsx`):
- `eventsByDay()`: korrekte Zuordnung von Events zu Tagesspalten (inkl. Monatsgrenze)
- `resolveContext()`: alle Owner-Typen + Fallback
- Zeitberechnung beim Drag (Datum wechselt, Uhrzeit bleibt)

**Integration-Test** (`apps/web/src/pages/CalendarPage.test.tsx`):
- CalendarPage rendert WeekCalendar mit gemockten Events
- Klick auf Termin öffnet EventForm
- Klick auf leere Zelle öffnet EventForm mit vorausgefülltem Datum

---

## Abnahmekriterien

1. Die Kalenderseite zeigt ausschließlich die Wochenansicht — kein Monatsgitter,
   keine FullCalendar-UI-Elemente sichtbar
2. Navigation Vor/Zurück wechselt die angezeigte Woche korrekt; KW-Nummer und
   Datumsbereich im Header stimmen überein
3. Jede Terminkachel zeigt: Titel, Kontext-Label, Zeitspanne und (sofern vorhanden)
   Avatar des Assignees im Footer
4. Kacheln lassen sich per Drag & Drop in eine andere Tagesspalte verschieben;
   nach Drop wird `onEventMove` mit korrekt berechnetem Start/End aufgerufen
5. Ein Drag auf denselben Tag löst keinen API-Call aus
6. Heutiger Tag ist im Spalten-Header visuell hervorgehoben
7. Design-Review: Kein hardcoded Hex-Wert außerhalb der Token-Datei;
   alle Farben kommen aus `var(--color-*)` 
8. Alle Unit- und Integration-Tests bestehen
