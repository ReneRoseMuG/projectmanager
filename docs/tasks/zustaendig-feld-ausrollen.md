# Codex-Auftrag: Feld „Zuständig" auf Projekt, Meilenstein, Aufgabe und Termin ausrollen

## Ziel

Das Feld `assignee` (Zuständige Person) existiert im Ticket bereits vollständig (DB, Service, Shared Types, API, Frontend). Es soll auf die folgenden vier Objekte ausgerollt werden:

- **Aufgabe (Task)** — DB/Service/Shared Types/API-Route bereits vorhanden, nur das Frontend-Formular fehlt
- **Projekt** — überall fehlend
- **Meilenstein** — überall fehlend
- **Termin (Event)** — überall fehlend

---

## Referenzimplementierung

Das vollständige Muster liegt im Ticket vor:

- **DB/Schema:** `assignee: text("assignee")` in `apps/api/src/db/schema.ts`
- **Service:** `apps/api/src/services/tickets.service.ts`
  - `ticketSelect.assignee = tickets.assignee`
  - Journal-Feld: `{ key: "assignee", label: "Zuständige Person" }`
  - `mapTicket`: `assignee: record.assignee`
  - `insertTicketRecord`: `assignee: cleanNullable(input.assignee) ?? null`
  - `updateTicket`: `if (input.assignee !== undefined) values.assignee = cleanNullable(input.assignee) ?? null`
- **Shared Types** (`packages/shared-types/src/index.ts`):
  - `interface Ticket`: `assignee: string | null`
  - `interface TicketInput`: `assignee?: string | null`
- **API-Route** (`apps/api/src/routes/tickets.ts`):
  - JSON-Schema-Eigenschaft: `assignee: { type: ["string", "null"] }`
- **Frontend** (`apps/web/src/components/tickets/TicketForm.tsx`):
  - `buildUserOptions(users, currentValue)` — lokale Hilfsfunktion
  - `useUsers(open)` — Hook zum Laden der Benutzerliste
  - `useState("")` für `assignee`
  - `<select>` mit Label „Zuständig", Option „Nicht zugewiesen", user options

Das `assignee`-Feld speichert einen **Freitext-Benutzernamen** (kein FK auf `users.id`), entsprechend `text("assignee")` — kein Integer.

---

## Schritt 1: Datenbankmigrationen

Neue Migrationsdatei in `apps/api/src/db/migrations/` anlegen (fortlaufende Nummer).

```sql
ALTER TABLE `projects` ADD `assignee` text;--> statement-breakpoint
ALTER TABLE `milestones` ADD `assignee` text;--> statement-breakpoint
ALTER TABLE `events` ADD `assignee` text;
```

> **Hinweis:** `tasks.assignee` existiert bereits in der DB — kein `ALTER TABLE` nötig.

Nach dem Anlegen Migration generieren/einbauen:
```
npm run db:generate   # in apps/api
npm run db:migrate
```

---

## Schritt 2: Drizzle-Schema (`apps/api/src/db/schema.ts`)

In den drei Tabellendefinitionen jeweils `assignee: text("assignee")` ergänzen:

```ts
// projects
export const projects = sqliteTable("projects", {
  // ...bestehende Felder...
  dueDate: text("due_date"),
  assignee: text("assignee"),   // NEU
  wikiPageId: ...
});

// milestones
export const milestones = sqliteTable("milestones", {
  // ...bestehende Felder...
  dueDate: text("due_date"),
  assignee: text("assignee"),   // NEU
  version: ...
});

// events
export const events = sqliteTable("events", {
  // ...bestehende Felder...
  reminderMinutes: ...
  assignee: text("assignee"),   // NEU
  version: ...
});
```

> `tasks.assignee` ist bereits vorhanden — kein Eingriff nötig.

---

## Schritt 3: Shared Types (`packages/shared-types/src/index.ts`)

### Project

```ts
export interface Project {
  // ...
  dueDate: string | null;
  assignee: string | null;   // NEU
  // ...
}

export interface ProjectInput {
  // ...
  dueDate?: string | null;
  assignee?: string | null;  // NEU
}
```

### Milestone

```ts
export interface Milestone {
  // ...
  dueDate: string | null;
  assignee: string | null;   // NEU
  // ...
}

export interface MilestoneInput {
  // ...
  dueDate?: string | null;
  assignee?: string | null;  // NEU
}
```

### Event

```ts
export interface Event {
  // ...
  reminderMinutes: number;
  assignee: string | null;   // NEU
  // ...
}

export interface EventInput {
  // ...
  reminderMinutes?: number;
  assignee?: string | null;  // NEU
}
```

Danach Shared Types neu bauen: `npm run build` im Paket `packages/shared-types`.

---

## Schritt 4: Services

### `apps/api/src/services/projects.service.ts`

1. **`projectJournalFields`** — Eintrag hinzufügen:
   ```ts
   { key: "assignee", label: "Zuständige Person" }
   ```
2. **`mapProject`** — `assignee: record.assignee` in das zurückgegebene `Project`-Objekt aufnehmen.
3. **`createProject`** — `assignee: cleanNullable(input.assignee) ?? null` beim Insert übergeben.
4. **`updateProject`** — Guard analog zu anderen optionalen Feldern:
   ```ts
   if (input.assignee !== undefined) {
     values.assignee = cleanNullable(input.assignee) ?? null;
   }
   ```

### `apps/api/src/services/milestones.service.ts`

Identisch zum Projekt-Service, Felder `MilestoneRecord` entsprechend ergänzen.

### `apps/api/src/services/events.service.ts`

1. **`eventJournalFields`** — Eintrag hinzufügen:
   ```ts
   { key: "assignee", label: "Zuständige Person" }
   ```
2. **`mapEvent`** — `assignee: record.assignee` ergänzen.
3. **`createEvent`** / **`updateEvent`** — analog; beim Update nur setzen wenn `input.assignee !== undefined`.

---

## Schritt 5: API-Routen

### `apps/api/src/routes/projects.ts`

Im JSON-Schema für Create- und Update-Body:
```ts
assignee: { type: ["string", "null"] }
```

### `apps/api/src/routes/milestones.ts`

Wie Projekte.

### `apps/api/src/routes/events.ts`

Wie Projekte.

> `apps/api/src/routes/tasks.ts` hat `assignee` bereits — kein Eingriff.

---

## Schritt 6: Frontend-Formulare

Das vollständige UI-Muster ist in `TicketForm.tsx` implementiert. Es besteht aus:

```tsx
// Imports oben
import { useUsers } from "../../hooks/useUsers"; // oder äquivalenter Pfad

// Hilfsfunktion (lokal oder aus shared utils importieren)
function buildUserOptions(users: UserOption[], currentValue: string) {
  const options = users.map((u) => ({ value: u.name, label: u.name }));
  if (currentValue && !options.find((o) => o.value === currentValue)) {
    options.unshift({ value: currentValue, label: currentValue });
  }
  return options;
}

// State
const [assignee, setAssignee] = useState(existingEntity?.assignee ?? "");
const userList = useUsers(open); // open = Dialog/Panel ist geöffnet
const assigneeOptions = useMemo(
  () => buildUserOptions(userList.users, assignee),
  [assignee, userList.users]
);

// Im Submit-Handler
assignee: assignee || null,

// Im JSX
<FormField label="Zuständig" error={userList.error ?? undefined}>
  <select
    value={assignee}
    onChange={(e) => setAssignee(e.target.value)}
    disabled={userList.loading || Boolean(userList.error)}
  >
    <option value="">
      {userList.loading ? "Benutzer werden geladen..." : "Nicht zugewiesen"}
    </option>
    {assigneeOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
</FormField>
```

### Betroffene Formulardateien

| Datei | Status |
|-------|--------|
| `apps/web/src/components/tasks/TaskForm.tsx` | `assignee: null` im Submit hardcodiert → durch echten State und Select ersetzen |
| `apps/web/src/components/projects/ProjectForm.tsx` | `assignee`-Feld vollständig hinzufügen |
| Milestone-Formular (Pfad identifizieren) | `assignee`-Feld vollständig hinzufügen |
| `apps/web/src/components/calendar/EventForm.tsx` | `assignee`-Feld vollständig hinzufügen |

> **Hinweis TaskForm:** Das `assignee`-Feld im Submit ist bereits im Code vorhanden (`assignee: null`), wird aber nie befüllt. Nur den State, den `useUsers`-Hook und das Select-Element ergänzen.

---

## Schritt 7: MCP-Server (falls zutreffend)

Falls der MCP-Server (`apps/mcp-server`) Projekte, Meilensteine, Aufgaben oder Termine über eigene Schemata exponiert und dort `assignee` fehlt, bitte analog ergänzen. Prüfung: Suche nach `ProjectInput`, `MilestoneInput`, `TaskInput`, `EventInput` im MCP-Quellcode.

---

## Reihenfolge

1. Migration anlegen + `db:generate` + `db:migrate`
2. `schema.ts` anpassen
3. `shared-types` anpassen + neu bauen
4. Services (projects, milestones, events)
5. API-Routen (projects, milestones, events)
6. Frontend-Formulare (TaskForm, ProjectForm, MilestoneForm, EventForm)
7. Build + TypeScript-Fehler beheben

---

## Tests

- Für jeden der vier Objekttypen: Erstellen mit `assignee`, Lesen, Aktualisieren (setzen, leeren), Journal-Eintrag prüfen.
- Bestehende Tests dürfen nicht brechen.
- Neue Integration-Tests analog zu bestehenden `tickets`-Tests.
