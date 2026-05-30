# Codex-Auftrag: WeekEventTile — Design-Korrekturen

**Datum:** 2026-05-27  
**Kontext:** MILE-20 · Refactoring Kalender/Planungssichten  
**Bezug:** TASK-97 (Wochenansicht-Umbau), bereits umgesetzt  
**Dateien:** `apps/web/src/components/calendar/WeekEventTile.tsx`, `apps/web/src/components/calendar/WeekCalendar.tsx`

---

## Ausgangssituation

Codex hat in TASK-97 die strukturelle Logik (Wochenraster, DnD, Navigation, `eventsByDay`,
`resolveEventContext`) korrekt umgesetzt. Das visuelle Design der Terminkachel weicht jedoch
an fünf Stellen vom Auftrag ab. Das Ergebnis ist eine einfarbig-graue, avatarlose Kachel
ohne erkennbare Kontext-Zuordnung.

---

## Befunde & Korrekturen

### 1 · Fehlender farbiger Linksrand (höchste Priorität)

**Problem:**  
`WeekEventTile` zeigt nur einen kleinen runden Farbpunkt (`h-2.5 w-2.5 rounded-full`).
Der im Auftrag spezifizierte 4 px breite linke Farbrand fehlt komplett.

**Korrektur:**  
Den `<button>`-Wrapper um einen Inline-Style `borderLeft: "4px solid {accentColor}"` ergänzen.
Das `rounded-full`-Dot-Element entfernen — die Farbe kommuniziert der Rand bereits.

```
// Vorher (WeekEventTile.tsx ~Zeile 46)
<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: context.accentColor }} />

// Nachher: dieses Element entfernen, stattdessen am button-Element:
style={{ ...style, borderLeft: `4px solid ${context.accentColor}` }}
```

---

### 2 · Vertauschte Farb-Tokens für Meilenstein und Aufgabe

**Problem:**  
In `WeekCalendar.tsx` sind die Fallback-Farben für Meilenstein und Aufgabe vertauscht:

```
// IST (falsch)
const milestoneAccent = "var(--color-tangerine)";  // orange — eigentlich für Aufgaben
const taskAccent      = "var(--color-mustard)";    // gelb   — nicht im Auftrag vorgesehen
```

**Korrektur:**

```
// SOLL
const milestoneAccent = "var(--color-violet)";     // #6A40BE
const taskAccent      = "var(--color-tangerine)";  // #ED8C3A
```

`--color-mustard` (gelb) war im ursprünglichen Auftrag für keinen Owner-Typ vorgesehen
und soll nicht verwendet werden.

---

### 3 · Fehlender Hintergrund-Tint

**Problem:**  
Die Kachel hat einen rein weißen Hintergrund (`bg-white`). Das Mockup zeigt eine
schwache farbige Füllung (Akzentfarbe mit 10 % Alpha), die den Kontext sofort
erkennbar macht.

**Korrektur:**  
`backgroundColor` im Inline-Style des `<button>`-Elements setzen:

```
backgroundColor: `${context.accentColor}1a`   // hex + "1a" = ~10 % Deckkraft
```

Dabei `bg-white` aus der `className` entfernen — der Hintergrund kommt jetzt per Inline-Style.

---

### 4 · Avatar-Komponente fehlt

**Problem:**  
`WeekEventTile` importiert die `Avatar`-Komponente nicht und rendert keinen Avatar im Footer.
Das `EventContext`-Interface enthält kein `assignee`-Feld.

**Korrektur — Schritt A: `EventContext` erweitern (`WeekCalendar.tsx`)**

```typescript
export interface EventContext {
  label: string;
  accentColor: string;
  ownerType: string;
  assignee: string | null;   // ← neu
}
```

**Korrektur — Schritt B: `resolveEventContext` liefert Assignee (`WeekCalendar.tsx`)**

Die Funktion bekommt das dritte Argument `tasks: Task[]` (bereits als Prop vorhanden):

```typescript
export function resolveEventContext(
  event: CalendarEvent,
  projects: Project[] = [],
  milestones: Milestone[] = [],
  tasks: Task[] = []
): EventContext
```

Im `task`-Branch:

```typescript
if (taskOwner) {
  const t = tasks.find((x) => x.id === taskOwner.id);
  return {
    label: t?.title ?? `Aufgabe #${taskOwner.id}`,
    accentColor: event.color ?? taskAccent,
    ownerType: "task",
    assignee: t?.assignee ?? null,   // ← neu
  };
}
```

Alle anderen Branches geben `assignee: null` zurück.

**Korrektur — Schritt C: `WeekEventTile` rendert Avatar**

```tsx
import { Avatar } from "../ui/Avatar";

// Im JSX, nach der Zeit-Zeile:
{context.assignee && (
  <div className="mt-1 flex justify-end">
    <Avatar name={context.assignee} size="sm" />
  </div>
)}
```

---

### 5 · `tasks`-Prop fehlt in `WeekDayColumn` und `resolveEventContext`-Aufruf

**Problem:**  
`WeekDayColumn` ruft `resolveEventContext(event, projects, milestones)` auf, übergibt
aber keine `tasks`. Da `tasks` nun für den Assignee benötigt wird, muss es durchgereicht
werden.

**Korrektur:**  
`WeekDayColumn` bekommt ein zusätzliches Prop `allTasks: Task[]`, das an jeden
`resolveEventContext`-Aufruf weitergegeben wird. `WeekCalendar` übergibt `tasks`
(bereits vorhanden) entsprechend.

---

## Betroffene Dateien (Zusammenfassung)

| Datei | Änderung |
|---|---|
| `WeekCalendar.tsx` | `milestoneAccent`/`taskAccent` korrigieren · `EventContext.assignee` ergänzen · `resolveEventContext` Signatur + Task-Branch · `tasks`-Weitergabe in `WeekDayColumn` |
| `WeekEventTile.tsx` | Dot-Element entfernen · `borderLeft` + `backgroundColor` Inline-Styles · `Avatar` importieren und im Footer rendern |

---

## Nicht verändern

- DnD-Logik (`useDraggable`, `useDroppable`, `DragOverlay`, `handleDragEnd`) — korrekt
- `eventsByDay()` — korrekt
- `moveEventToDate()` — korrekt
- `CalendarPage.tsx` — keine Änderung nötig
- `EventForm.tsx`, `UpcomingEvents.tsx`, `CalendarSkeleton.tsx` — unberührt

---

## Abnahmekriterien

1. Jede Kachel hat einen **4 px breiten linken Rand** in der Kontext-Farbe
2. Kachel-Hintergrund zeigt den **10 %-Alpha-Tint** der Kontext-Farbe
3. Meilenstein-Kacheln sind **violett**, Aufgaben-Kacheln **orange** (kein gelb)
4. Hat ein Termin einen Task-Owner mit gesetztem `assignee`, erscheint dessen
   **Avatar (size="sm")** im Kachel-Footer rechts
5. Alle bestehenden Unit-Tests (`WeekCalendar.test.tsx`) bestehen weiterhin
6. Kein Hardcoded-Hex außerhalb von `theme.css`
