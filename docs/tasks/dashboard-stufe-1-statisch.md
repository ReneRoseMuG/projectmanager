# Codex-Aufgabe: Dashboard Stufe 1 — Statische Widget-Dashboards

## Zusammenfassung

Stufe 1 führt die Grundlage des Dashboard-Systems ein: sieben schlanke, read-only
Widgets (`TaskStatusReport`, `TicketStatusReport`, `TaskJournal`, `TicketJournal`,
`GlobalJournalWidget`, `CommentJournal`, `AttachmentJournal`) werden über einen
einheitlichen `owner`-Parameter in vier fixen Dashboard-Kompositionen kombiniert
und in die bestehenden Detail-Seiten integriert. Jedes Widget kennt nur seinen
eigenen Datenbedarf — was wo angezeigt wird, entscheidet die Komposition. Stufe 1
liefert den vollständigen MVP ohne jede Konfigurierbarkeit: solide, wartbar und
direkte Basis für Stufe 2.

---

## Aufgabenbeschreibung

Es sollen für die Domain-Objekte Projekt, Meilenstein, Aufgabe sowie global eine
Dashboard-Ansicht eingeführt werden. Die Dashboards bestehen aus kleinen,
rein lesenden Widgets, die über einen `owner`-Scope-Parameter gesteuert werden.
Die Kompositionen sind in dieser Stufe hardcodiert.

---

## Scope

**Backend:**
- `apps/api/src/routes/tasks.ts` — neuer Stats-Endpunkt
- `apps/api/src/routes/tickets.ts` — neuer Stats-Endpunkt
- `apps/api/src/routes/comments.ts` — neuer `comments/recent` Endpunkt
- `apps/api/src/routes/attachments.ts` — neuer `attachments/recent` Endpunkt
- `apps/api/src/services/tasks.service.ts` — neue Aggregations-Methode
- `apps/api/src/services/tickets.service.ts` — neue Aggregations-Methode
- `apps/api/src/services/comments.service.ts` — neue Aggregations-Methode
- `apps/api/src/services/attachments.service.ts` — neue Aggregations-Methode
- `apps/api/src/routes/journal.ts` — Prüfung globaler Modus
- `packages/shared-types/src/index.ts` — neue Typen

**Frontend:**
- `apps/web/src/api/dashboard.ts` — neue API-Client-Funktionen
- `apps/web/src/hooks/useTaskStats.ts` — neu
- `apps/web/src/hooks/useTicketStats.ts` — neu
- `apps/web/src/hooks/useRecentComments.ts` — neu
- `apps/web/src/hooks/useRecentAttachments.ts` — neu
- `apps/web/src/hooks/useJournal.ts` — `useGlobalJournalEntries` ergänzen
- `apps/web/src/components/dashboard/` — neues Verzeichnis
- `apps/web/src/pages/DashboardPage.tsx` — neu
- `apps/web/src/App.tsx` — Route `/dashboard`
- `apps/web/src/components/layout/` — Navigationseintrag
- `apps/web/src/components/projects/ProjectForm.tsx` — Tab „Übersicht"
- `apps/web/src/components/milestones/MilestoneForm.tsx` — Tab „Übersicht"
- `apps/web/src/components/tasks/TaskForm.tsx` — Tab „Übersicht" (konditionell)

---

## Schritt 1: Bestandsaufnahme

Lies zunächst den Architektur-Leitfaden vollständig: `docs/architecture-leitfaden.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `routes/tasks.ts` | Keine Stats-Route | `GET /tasks/stats` ergänzt |
| `routes/tickets.ts` | Keine Stats-Route | `GET /tickets/stats` ergänzt |
| `routes/comments.ts` | Kein aggregierter Endpunkt | `GET /comments/recent` ergänzt |
| `routes/attachments.ts` | Kein aggregierter Endpunkt | `GET /attachments/recent` ergänzt |
| `services/tasks.service.ts` | Keine Aggregation | `getTaskStats(owner?)` ergänzt |
| `services/tickets.service.ts` | Keine Aggregation | `getTicketStats(owner?)` ergänzt |
| `services/comments.service.ts` | Keine Aggregation | `getRecentComments(opts)` ergänzt |
| `services/attachments.service.ts` | Keine Aggregation | `getRecentAttachments(opts)` ergänzt |
| `routes/journal.ts` | Globaler Endpunkt existiert | Verhalten ohne Filter prüfen |
| `shared-types/index.ts` | Keine Dashboard-Typen | Neue Typen ergänzt |
| `api/dashboard.ts` | Nicht vorhanden | Neu anlegen |
| `hooks/useTaskStats.ts` | Nicht vorhanden | Neu |
| `hooks/useTicketStats.ts` | Nicht vorhanden | Neu |
| `hooks/useRecentComments.ts` | Nicht vorhanden | Neu |
| `hooks/useRecentAttachments.ts` | Nicht vorhanden | Neu |
| `hooks/useJournal.ts` | Nur Objekt-Modus | `useGlobalJournalEntries` ergänzt |
| `components/dashboard/` | Nicht vorhanden | Vollständig neu |
| `pages/DashboardPage.tsx` | Nicht vorhanden | Neu |
| `App.tsx` | Keine `/dashboard`-Route | Route ergänzt |
| `ProjectForm.tsx` | Kein Übersicht-Tab | Tab „Übersicht" als ersten Tab |
| `MilestoneForm.tsx` | Kein Übersicht-Tab | Tab „Übersicht" als ersten Tab |
| `TaskForm.tsx` | Kein Übersicht-Tab | Tab „Übersicht" konditionell |

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Shared Types

In `packages/shared-types/src/index.ts` ergänzen:

```typescript
export interface TaskStats {
  statusCounts: Record<string, number>;
  total: number;
}

export interface TicketStats {
  statusCounts: Record<string, number>;
  total: number;
}

export type DashboardOwnerType = "project" | "milestone" | "task";

export interface DashboardOwner {
  type: DashboardOwnerType;
  id: number;
}

export interface RecentComment {
  id: number;
  body: string;
  createdAt: string;
  authorName: string;
  entityType: string;
  entityId: number;
  entityLabel: string;
}

export interface RecentAttachment {
  id: number;
  filename: string;
  mimetype: string;
  fileSize: number;       // Bytes
  createdAt: string;
  authorName: string;
  entityType: string;
  entityId: number;
  entityLabel: string;
}
```

---

## Schritt 3: Backend

### 3a — Task-Stats-Service

In `services/tasks.service.ts` Funktion `getTaskStats(db, owner?)` anlegen:
- Ohne `owner` → alle Tasks aggregiert
- Mit `owner` → JOIN auf `project_tasks`, `milestone_tasks` oder `task_tasks`
- SQL `GROUP BY status`, nur Werte mit `count > 0`

### 3b — Ticket-Stats-Service

Analog in `services/tickets.service.ts`. `owner.type = "task"` nicht erlaubt.

### 3c — Stats-Routen

```
GET /tasks/stats
  Query: ownerType? (project | milestone | task), ownerId? (integer)
  Validierung: beide oder keiner der Parameter

GET /tickets/stats
  Query: ownerType? (project | milestone), ownerId? (integer)
  Validierung: ownerType=task → HTTP 400
```

### 3d — Kommentar-Aggregations-Service

In `services/comments.service.ts` Funktion `getRecentComments(db, opts)`:
- `mine=true` ohne owner → eigene Kommentare des aktuellen Nutzers
- `ownerType=project` → UNION über alle Comment-Junction-Tabellen mit
  JOIN auf die jeweiligen Owner-Tabellen
- `ownerType=milestone` → Tasks und Tickets des Meilensteins
- `ownerType=task` → `task_comments` direkt
- Jeden Treffer mit `entityLabel` anreichern (JOIN auf Objekt-Tabelle)
- Sortierung `createdAt desc`, `limit` max 50

### 3e — Kommentar-Route

```
GET /comments/recent
  Query: ownerType?, ownerId?, mine? (boolean), limit? (max: 50)
  Validierung: ownerType + ownerId gemeinsam oder keiner;
               mine=true nur ohne owner
```

### 3f — Attachment-Aggregations-Service

In `services/attachments.service.ts` Funktion `getRecentAttachments(db, opts)`.
Identische Logik wie `getRecentComments`, aber über die Attachment-Junction-Tabellen
(`task_attachments`, `project_attachments`, `ticket_attachments`, `feature_attachments`):
- `mine=true` ohne owner → eigene Uploads
- Mit owner → alle Attachments im Kontext
- Response enthält `filename`, `mimetype`, `fileSize`, `entityLabel`

### 3g — Attachment-Route

```
GET /attachments/recent
  Query: ownerType?, ownerId?, mine? (boolean), limit? (max: 50)
  Validierung: analog zu comments/recent
```

### 3h — Journal-Globalendpunkt prüfen

`GET /journal` existiert. Prüfen ob ohne Filter + mit `limit` korrekt funktioniert.
Kein neuer Endpunkt nötig.

---

## Schritt 4: API-Client (`api/dashboard.ts`)

```typescript
export async function getTaskStats(owner?: DashboardOwner): Promise<TaskStats>
export async function getTicketStats(owner?: DashboardOwner): Promise<TicketStats>
export async function getRecentComments(opts: {
  owner?: DashboardOwner; mine?: boolean; limit?: number;
}): Promise<RecentComment[]>
export async function getRecentAttachments(opts: {
  owner?: DashboardOwner; mine?: boolean; limit?: number;
}): Promise<RecentAttachment[]>
```

---

## Schritt 5: Hooks

- `useTaskStats(owner?)` → `{ counts, total, loading, error }`
- `useTicketStats(owner?)` → analog
- `useRecentComments(opts)` → `{ comments, loading, error }`
- `useRecentAttachments(opts)` → `{ attachments, loading, error }`
- `useGlobalJournalEntries(opts)` → in `useJournal.ts` ergänzen

---

## Schritt 6: Widgets

Alle in `components/dashboard/`, alle vollständig read-only.

### Widget 1: `TaskStatusReport`
Props: `owner?: DashboardOwner`
- `useTaskStats(owner)` → Zeile pro Status: `StatusPill` + Zahl
- Klick → gefilterte Aufgabenliste
- Loading: Skeleton, Empty: `ListTodo` / „Keine Aufgaben"

### Widget 2: `TicketStatusReport`
Props: `owner?: DashboardOwner` (nur project/milestone)
- Analog für Tickets. Empty: `Inbox` / „Keine Tickets"

### Widget 3: `TaskJournal`
Props: `owner?: DashboardOwner`, `limit?` (default: 10)
- Bestehender Task-Endpunkt mit `limit` + `sort=createdAt:desc`
- Pro Eintrag: Titel, `StatusPill`, `PriorityBadge`, Beschreibung (2Z), Datum, Tag
- **Prüfen ob `limit`/`sort` an bestehenden Endpunkten vorhanden, ggf. ergänzen**

### Widget 4: `TicketJournal`
Props: `owner?: DashboardOwner`, `limit?` (default: 10)
- Analog. Pro Eintrag: Titel, Typ-Icon, `StatusPill`, Beschreibung, Datum

### Widget 5: `GlobalJournalWidget`
Props: `owner?: { type: "project"; id: number }`, `limit?` (default: 20)
- `useGlobalJournalEntries` → **`JournalEntryList` direkt wiederverwenden**

### Widget 6: `CommentJournal`
Props: `owner?: DashboardOwner`, `limit?` (default: 10)
- Ohne owner: `mine=true` (eigene Kommentare)
- Mit owner: alle Kommentare im Kontext
- Pro Eintrag: Kommentartext (2Z), Objekt-Typ-Icon + `entityLabel` (klickbar),
  Autor (entfällt global), Zeitstempel (`MessageSquare`-Icon)
- Objekt-Links: task→`/tasks/:id`, ticket→`/tickets/:id`, project→`/projects/:id`, usw.

### Widget 7: `AttachmentJournal`
Props: `owner?: DashboardOwner`, `limit?` (default: 10)
- Ohne owner: `mine=true` (eigene Uploads)
- Mit owner: alle Attachments im Kontext
- Pro Eintrag:
  - Datei-Typ-Icon (je nach `mimetype`: Bild → `Image`, PDF → `FileText`,
    Tabelle → `Table2`, generisch → `Paperclip`) + Dateiname (klickbar → Download)
  - Objekt-Typ-Icon + `entityLabel` (klickbar → Detailseite des Besitzers)
  - Dateigröße human-readable (KB / MB)
  - Autor (entfällt im globalen Kontext)
  - Upload-Datum (`Paperclip`-Icon)
- Loading: Skeleton, Empty: `Paperclip` / „Keine Anhänge"

### Layout: `DashboardGrid`
Props: `children: React.ReactNode`
Responsives 2-spaltiges Grid, `data-span="full"` für volle Breite.

### Kompositionen

**`GlobalDashboard`**
1. `TaskStatusReport` + `TicketStatusReport` (2-spaltig)
2. `GlobalJournalWidget` (voll)
3. `TaskJournal` + `TicketJournal` (2-spaltig)
4. `CommentJournal` + `AttachmentJournal` (2-spaltig, je mine=true)

**`ProjectDashboard` (`projectId: number`)**
1. `TaskStatusReport` + `TicketStatusReport` (2-spaltig)
2. `TaskJournal` + `TicketJournal` (2-spaltig)
3. `CommentJournal` + `AttachmentJournal` (2-spaltig)
4. `GlobalJournalWidget` (voll)

**`MilestoneDashboard` (`milestoneId: number`)**
1. `TaskStatusReport` + `TicketStatusReport` (2-spaltig)
2. `TaskJournal` + `CommentJournal` (2-spaltig)
3. `AttachmentJournal` (voll)

**`TaskDashboard` (`taskId: number`)**
1. `TaskStatusReport` (voll, Subtasks)
2. `TaskJournal` + `CommentJournal` (2-spaltig)
3. `AttachmentJournal` (voll)

---

## Schritt 7: Neue Seite und Route

- `pages/DashboardPage.tsx` → `<GlobalDashboard />`
- Route `/dashboard` in `App.tsx`
- Navigationseintrag „Dashboard" mit Icon `LayoutDashboard`

---

## Schritt 8: Integration in bestehende Forms

- `ProjectForm.tsx`: Tab „Übersicht" als ersten Tab (`variant="page"`, nur bestehende Projekte)
- `MilestoneForm.tsx`: analog
- `TaskForm.tsx`: Tab „Übersicht" nur wenn `task.subtaskCount > 0`

---

## Schritt 9: Tests

### 9a — Integration-Tests (`dashboard-stats.test.ts`)

**`GET /tasks/stats`:**
- Ohne Owner, mit project, milestone, task
- Status mit `count=0` fehlen, `total` korrekt
- Nur `ownerType` ohne `ownerId` → HTTP 400

**`GET /tickets/stats`:** analog, `ownerType=task` → HTTP 400

**`GET /comments/recent`:**
- `mine=true` → nur eigene Kommentare
- Mit `ownerType=project/milestone/task` → korrekte Filterung
- `entityLabel` befüllt, `limit` eingehalten
- `mine=true` + `ownerType` → HTTP 400

**`GET /attachments/recent`:**
- Analog zu `comments/recent`
- `filename`, `mimetype`, `fileSize`, `entityLabel` in Response vorhanden
- `mine=true` + `ownerType` → HTTP 400

**`GET /journal` (Globalmode):** ohne Filter, mit `limit`

### 9b — E2E-Tests (`dashboard.spec.ts`)

- `/dashboard` lädt, alle Widgets sichtbar
- `TaskStatusReport` zeigt korrekte Zählungen
- Klick auf Status navigiert zur gefilterten Liste
- `CommentJournal` zeigt Kommentar nach dem Posten, `entityLabel` klickbar
- `AttachmentJournal` zeigt Datei nach dem Upload, Dateiname klickbar (Download)
- Tab „Übersicht" in ProjectForm und MilestoneForm sichtbar
- Tab „Übersicht" in TaskForm nur bei `subtaskCount > 0`

---

## Abnahmekriterien

- [ ] `GET /tasks/stats` und `GET /tickets/stats` korrekt
- [ ] `GET /comments/recent` mit `entityLabel` für alle Kontexte
- [ ] `GET /attachments/recent` mit `entityLabel` für alle Kontexte
- [ ] Journal-Globalendpunkt limit-fähig ohne Filter
- [ ] Alle sieben Widgets gerendert, fehlerfrei, read-only
- [ ] `GlobalJournalWidget` ohne Code-Duplikation (`JournalEntryList` wiederverwendet)
- [ ] `CommentJournal` und `AttachmentJournal` zeigen im globalen Kontext keinen Autor
- [ ] `DashboardPage` unter `/dashboard`, Navigationseintrag vorhanden
- [ ] Tab „Übersicht" in ProjectForm, MilestoneForm, TaskForm korrekt
- [ ] Loading- und Empty-States in allen Widgets
- [ ] Alle Integration-Tests grün
- [ ] Alle E2E-Tests grün
- [ ] Keine bestehenden Tests gebrochen

---

## Referenz

- Konzept: `docs/tasks/konzept-dashboards.md`
- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- `apps/web/src/components/journal/JournalPanel.tsx`
- `apps/api/src/routes/comments.ts`, `apps/api/src/routes/attachments.ts`
- `apps/api/src/services/comments.service.ts`, `apps/api/src/services/attachments.service.ts`
- `packages/shared-types/src/index.ts`
