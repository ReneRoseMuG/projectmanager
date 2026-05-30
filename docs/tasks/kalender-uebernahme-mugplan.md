# Codex-Auftrag: Kalender-Übernahme aus MuGPlan

**Klasse:** 5 – Mehrschichtige Änderung  
**Branch:** `feature/calendar-mugplan-port`  
**Scope:** `apps/web/src/components/calendar/`  
**Ziel:** Den MuGPlan-Kalender in den Projekt Manager portieren — ohne Tour-Unterscheidung,
mit Dreizonenkacheln (HeaderBar | Body | Footer) und Status-basierter Farbgebung,
vollständig im Design-System des Projekt Managers.

---

## 0. Kontext und Ausgangslage

### Projekt-Manager-Kalender (Ist)

| Datei | Funktion | Bewertung |
|---|---|---|
| `WeekCalendar.tsx` | Wochenkalender, 7 Tagesspalten, DnD, Navigation | **Basis behalten** |
| `WeekEventTile.tsx` | Einfache Kachel: linker Akzentstreifen + Titel + Uhrzeit | **Ersetzen** durch Dreizonenkachel |
| `CalendarView.tsx` | Monatskalender auf Basis von FullCalendar | **Ersetzen** durch eigene Implementierung |
| `CalendarDashboardProvider.tsx` | Queries + State für Kalender-Seite | **Behalten, ggf. erweitern** |
| `UpcomingEvents.tsx` | Vorschauliste kommender Ereignisse | **Unberührt** |
| `EventForm.tsx` | Formular zur Terminerstellung | **Unberührt** |

### MuGPlan-Kalender (Vorlage)

Quellpfad: `C:\Users\schro\source\repos\Plan\Releases\version02\client\src\components\calendar\`

| Vorlage-Datei | Portierte Idee |
|---|---|
| `CalendarWeekView.tsx` | Wochenraster-Architektur: eine Tagesspalte pro Tag, Stapel-Logik |
| `CalendarWeekAppointmentPanel.tsx` + `*Header/Customer/Employee/Project*` | Dreizonenkachel: HeaderBar \| Body \| Footer |
| `CalendarWeekSpanningTile.tsx` | Mehrtages-Balken im Wochenkalender |
| `CalendarMonthSheetView.tsx` | Monatsraster: eine Tageszelle, gestapelte Kompaktbalken |
| `CalendarAppointmentCompactBar.tsx` | Monatskachel (Kompaktbalken) |
| `CalendarMarkerHeaderLabel.tsx` | Feiertags-Badge im Spaltenkopf |
| `weekAppointmentCardStyles.ts` | Kachelkonstanten: Höhen, Farb-Utility |

Die MuGPlan-Dateien sind **nicht** zu kopieren oder zu importieren. Sie dienen als
Referenz-Architektur. Alle neuen Komponenten werden neu geschrieben und orientieren
sich am **Design-System des Projekt Managers**.

---

## 1. Design-Regeln (verbindlich)

Alle neuen Komponenten halten sich strikt an `design-richtlinien-visuell.md`:

| Regel | Konkrete Vorgabe |
|---|---|
| Farb-Token | Nur `steel-*`, `fern`, `crimson`, `tangerine`, `teal`, `bg-shell`, `border-line` — kein `slate-*`, `gray-*` |
| Radius | Kachel-Container: `rounded-lg`. Kachelkopf (HeaderBar): `rounded-t-lg`. Buttons: `rounded-md`. Keine `rounded-2xl`, kein `rounded-full` auf Kacheln |
| Schatten | `shadow-sm` (Ruhezustand), `shadow-panel` (Hover/Aktiv). Keine Raw-Tailwind-Schatten |
| Inline-Styles | Nur für datengetriebene Farben (Status-Farbe der Kachel), DnD-Transforms, Grid-Order. Keine strukturellen Inline-Styles |
| Text-Größe | Spaltenkopf-Wochentag: `text-xs font-bold uppercase tracking-wide text-steel-400`. Tagesdatum: `text-lg font-bold text-ink` (Heute: `text-teal`). Kacheltexte: `text-xs`/`text-sm` wie definiert |
| Buttons | `variant="ghost"` / `variant="secondary"` über die vorhandene `<Button>`-Komponente |
| Status-Punkte | `rounded-full` erlaubt (kleine Statuspunkte, s. Design-Richtlinien Abschn. 12) |

---

## 2. Status-Farbsystem

**Neue Datei:** `apps/web/src/lib/task-status-color.ts`

```typescript
/**
 * Gibt den CSS-Farbwert für den Kopfbereich einer Terminkachel zurück.
 * Quelle: Tailwind-Token des Projekt Managers.
 * Kein direkter Zugriff auf task.color oder tour-Felder.
 */
export function resolveTaskStatusColor(status: string): string {
  switch (status) {
    case "todo":       return "var(--color-steel-400)";
    case "open":       return "var(--color-steel-500)";
    case "in_progress":return "var(--color-teal)";
    case "in_review":  return "var(--color-tangerine)";
    case "done":
    case "resolved":
    case "completed":  return "var(--color-fern)";
    case "closed":
    case "rejected":   return "var(--color-steel-300)";
    default:           return "var(--color-steel-400)";
  }
}
```

Diese Funktion wird überall verwendet, wo die Kachelfarbe benötigt wird.
Kein direkter Zugriff auf `task.color` im Render-Pfad der Kacheln.

---

## 3. Neue Wochenkachel: `WeekTaskTile.tsx`

`WeekEventTile.tsx` wird durch `WeekTaskTile.tsx` ersetzt (oder parallel angelegt).

### Struktur

```
<article class="rounded-lg border border-line shadow-sm hover:shadow-panel">
  ┌─ HeaderBar (rounded-t-lg, Hintergrund = resolveTaskStatusColor(task.status)) ──┐
  │  text-xs font-semibold text-white                                              │
  │  [Inhalt: Platzhalter — wird in Folgeauftrag definiert]                        │
  └────────────────────────────────────────────────────────────────────────────────┘
  ┌─ Body (bg-white, px-3 py-2) ───────────────────────────────────────────────────┐
  │  text-sm font-semibold text-ink                                                │
  │  [Inhalt: Platzhalter — wird in Folgeauftrag definiert]                        │
  └────────────────────────────────────────────────────────────────────────────────┘
  ┌─ Footer (bg-shell, border-t border-line, rounded-b-lg, px-3 py-2) ────────────┐
  │  text-xs text-steel-500                                                        │
  │  [Inhalt: Platzhalter — wird in Folgeauftrag definiert]                        │
  └────────────────────────────────────────────────────────────────────────────────┘
</article>
```

### Mindest-Props-Interface

```typescript
interface WeekTaskTileProps {
  task: Task;
  dragging?: boolean;
  overlay?: boolean;
  onClick?: (task: Task) => void;
}
```

### Höhen-Konstanten (analog MuGPlan, als benannte Konstanten exportieren)

```typescript
export const WEEK_TILE_HEADER_HEIGHT_PX = 48;
export const WEEK_TILE_FOOTER_HEIGHT_PX = 60;   // kompakt
export const WEEK_TILE_MIN_HEIGHT_PX = 180;
```

### Platzhalter-Inhalte (bis Folgeauftrag)

- HeaderBar: Zeigt vorerst `task.status` als Badge (vgl. `<Badge tone="…">`)
- Body: Zeigt vorerst `task.title` (truncated)
- Footer: Zeigt vorerst `task.dueDate` (formatiert als `dd.MM.yy`)

### DnD

Übernimmt die bestehende DnD-Logik aus `WeekEventTile.tsx` mit `useDraggable`.

---

## 4. Wochenkalender: `WeekCalendar.tsx` erweitern

### Was bleibt unverändert

- 7-Tagesspalten-Grid (`grid-cols-7`)
- Navigations-Header mit `ChevronLeft`, `Heute`, `ChevronRight` an den **äußeren Rändern**
  (`justify-between` — Zurück links, Weiter rechts, Heute dazwischen oder beides rechts)
- DnD-Kontext (`DndContext`, `useDroppable`, `DragOverlay`)
- `WeekDayColumn` als Tagesspalten-Container

### Was geändert wird

**Kachel-Typ:** In `WeekDayColumn` `<WeekEventTile>` durch `<WeekTaskTile>` ersetzen.
`CalendarEvent`-Objekte werden weiterhin optional unterstützt (Termin-Kachel als
einfachere Variante ohne Dreizonenteilung, analog dem bestehenden Tile).

**Stapel-Logik:** Mehrere Tasks pro Tag werden vertikal gestapelt (bereits durch `grid gap-2`
gegeben). Die Reihenfolge ist: `in_progress` → `in_review` → `open` → `todo` → `done`/Rest.

**Sortier-Funktion** (neu in `WeekCalendar.tsx` oder ausgelagert in `lib/`):

```typescript
const STATUS_PRIORITY: Record<string, number> = {
  in_progress: 0,
  in_review: 1,
  open: 2,
  todo: 3,
  done: 4,
  resolved: 4,
  completed: 4,
  closed: 5,
  rejected: 5,
};
function taskSortKey(task: Task): number {
  return STATUS_PRIORITY[task.status] ?? 3;
}
```

**Feiertags-Badge:** Im Spaltenkopf von `WeekDayColumn` wird ein kleines Feiertags-Badge
platziert, wenn für diesen Tag ein Feiertag aus dem CalendarMarker-System vorliegt.
Details → Abschnitt 6.

---

## 5. Monatskalender: neues `MonthCalendar.tsx`

Die bestehende `CalendarView.tsx` (FullCalendar) bleibt für Ereignis-Kacheln erhalten.
**Zusätzlich** wird eine eigene Monatsansicht für Tasks gebaut:
`apps/web/src/components/calendar/MonthCalendar.tsx`.

### Struktur

```
<section class="rounded-lg border border-line bg-white shadow-sm">
  ├── Header: Monatsname + Nav-Buttons (← Monat Heute Monat →)
  └── Grid: 7 Spalten (Mo–So), N Wochen-Zeilen
      └── Tageszelle <MonthDayCell>
          ├── Kopf: Datum + optionaler Feiertags-Badge
          └── Kompaktbalken-Liste: <MonthTaskBar> je Task mit dueDate == diesem Tag
```

### `MonthTaskBar.tsx` (neue Datei)

Analog zu MuGPlans `CalendarAppointmentCompactBar.tsx`, aber im PM-Design:

```
<div class="flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-white cursor-pointer">
  [Farbhintergrund: resolveTaskStatusColor(task.status)]
  [Icon: kleiner Statuspunkt rounded-full]
  [Text: task.title truncated]
</div>
```

Inline-Style nur für `backgroundColor` (datengetrieben, gem. Design-Richtlinien Abschn. 2.4).

### Navigation

```tsx
<Button variant="secondary" size="sm" icon={<ChevronLeft />}>Zurück</Button>
<Button variant="secondary" size="sm" icon={<CalendarDays />} onClick={() => setMonth(new Date())}>Heute</Button>
<Button variant="secondary" size="sm" icon={<ChevronRight />}>Weiter</Button>
```

Buttons stehen links (Zurück) und rechts (Weiter) mit Heute dazwischen — analog der
bestehenden `WeekCalendar.tsx`-Navigation.

---

## 6. Feiertags-Badge: `CalendarHolidayBadge.tsx`

### Backend-Anforderung

Das bestehende Kalender-System des Projekt Managers hat noch kein CalendarMarker-System.
Für die erste Version wird ein **vereinfachtes, clientseitiges Feiertags-Lookup** eingebaut:

**Neue Datei:** `apps/web/src/lib/german-holidays.ts`

```typescript
import Holidays from "date-holidays";

/** Gibt Feiertagsnamen für ein Datum zurück (national + optional regional). */
export function getGermanHolidaysForDate(dateKey: string, states: string[] = []): string[] { … }
```

`date-holidays` ist bereits eine indirekte Abhängigkeit (über MuGPlan bekannt) und
muss in `apps/web/package.json` ergänzt werden: `"date-holidays": "^3"`.

### Komponente

```tsx
// CalendarHolidayBadge.tsx
export function CalendarHolidayBadge({ dateKey }: { dateKey: string }) {
  const holidays = getGermanHolidaysForDate(dateKey);
  if (holidays.length === 0) return null;
  return (
    <span
      title={holidays.join(", ")}
      className="inline-flex items-center rounded border border-line bg-shell px-1.5 py-0.5 text-[10px] font-semibold text-steel-600"
    >
      FT
    </span>
  );
}
```

Dieses Badge erscheint im Spaltenkopf von `WeekDayColumn` und im Tageszellen-Kopf
von `MonthDayCell`, rechtsbündig neben dem Datum.

---

## 7. Dateien-Übersicht: Neu / Geändert / Unberührt

### Neu anlegen

| Datei | Inhalt |
|---|---|
| `apps/web/src/lib/task-status-color.ts` | `resolveTaskStatusColor()` |
| `apps/web/src/lib/german-holidays.ts` | `getGermanHolidaysForDate()` |
| `apps/web/src/components/calendar/WeekTaskTile.tsx` | Dreizonenkachel für Wochenkalender |
| `apps/web/src/components/calendar/MonthCalendar.tsx` | Eigener Monatskalender |
| `apps/web/src/components/calendar/MonthTaskBar.tsx` | Kompaktbalken für Monatskalender |
| `apps/web/src/components/calendar/CalendarHolidayBadge.tsx` | Feiertags-Badge |

### Ändern

| Datei | Änderung |
|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | `WeekEventTile` → `WeekTaskTile` einbinden; Sortierung; Holiday-Badge in Spaltenkopf |
| `apps/web/src/components/calendar/WeekEventTile.tsx` | Für Termin-Kacheln behalten, aber von `WeekTaskTile` entkoppeln |
| `apps/web/package.json` | `"date-holidays": "^3"` ergänzen |

### Unberührt

| Datei | Grund |
|---|---|
| `CalendarDashboardProvider.tsx` | Queries bleiben stabil |
| `UpcomingEvents.tsx` | Nicht im Scope |
| `EventForm.tsx` | Nicht im Scope |
| `CalendarView.tsx` | FullCalendar-Variante bleibt für Termin-Ansicht erhalten |

---

## 8. Verbotene Muster (Erinnerung)

- Kein `slate-*`, `gray-*`, `text-muted` — nur `steel-*`-Token
- Kein `rounded-2xl`, `rounded-full` auf Kacheln, Modals, Buttons
- Kein `shadow`, `shadow-md`, `shadow-lg` — nur `shadow-sm` / `shadow-panel`
- Kein `window.confirm()` — `useConfirm()` verwenden
- Keine Inline-Styles für strukturelles Styling (Hintergrund ohne Datenbezug)

---

## 9. Abhängigkeit prüfen: `date-holidays`

Vor Installation prüfen, ob `date-holidays` bereits in `apps/web/node_modules` existiert
(transitiv eingebunden). Falls ja, nur `package.json` ergänzen. Falls nein, installieren
und prüfen, ob TreeShaking oder Bundle-Größe ein Problem darstellt.
Bei Bedenken: statische Feiertagsliste für Deutschland für laufendes + nächstes Jahr
als Fallback in `german-holidays.ts` einbetten.

---

## 10. Abnahme-Checkliste

- [ ] `WeekTaskTile` hat HeaderBar / Body / Footer mit den richtigen PM-Token
- [ ] Farbe der HeaderBar kommt aus `resolveTaskStatusColor(task.status)`
- [ ] Navigations-Buttons: Zurück links, Weiter rechts (äußere Ränder)
- [ ] Mehrere Tasks pro Tag werden im Wochenkalender vertikal gestapelt
- [ ] Reihenfolge: `in_progress` zuerst, `done`/`closed` zuletzt
- [ ] Feiertags-Badge erscheint im Spaltenkopf und Tageszellen-Kopf
- [ ] Monatskalender zeigt Kompaktbalken je Task mit `dueDate` am jeweiligen Tag
- [ ] Keine `slate-*`, `gray-*`, `text-muted`, `rounded-2xl`, Raw-Schatten im neuen Code
- [ ] `tsc --noEmit` fehlerfrei
- [ ] ESLint fehlerfrei
