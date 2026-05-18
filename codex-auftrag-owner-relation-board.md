# Codex-Auftrag: Einheitliche Create/Edit-Formulare mit Owner-Relation-Boards

**Version:** 2 — Kommentare, Notizen und Dateien im Create-Modus vollständig gleichgestellt

## Ziel

Jede Entität (Project, Feature, UseCase, Task) erhält **eine einzige Form-Komponente**, die sowohl für Create als auch für Edit verwendet wird. Create und Edit zeigen **dieselben Tabs ohne Ausnahme**. Der einzige Unterschied liegt in der Datenhaltung: im Create-Modus werden alle Inhalte als lokaler Pending-State gehalten und nach dem Speichern der Parent-Entität sequenziell angelegt. Im Edit-Modus laufen alle Operationen direkt gegen die API.

---

## Architekturgrundsatz

```
Jede Entität — Create und Edit identisch:

  Tab           Create-Modus                   Edit-Modus
  ──────────    ─────────────────────────────  ─────────────────────────────
  Details       Formularfelder                 Formularfelder
  Aufgaben      PendingRelationList            OwnerTaskBoard
  Tickets       PendingRelationList            OwnerTicketBoard
  Use Cases     PendingRelationList            UseCaseListBoardView
  Projekte      PendingRelationList            FeatureProjectPanel
  Subtasks      PendingRelationList            SubtaskList
  Kommentare    PendingCommentList             CommentThread
  Notizen       PendingNoteList                NoteList + NoteEditor
  Dateien       PendingFileList                AttachmentUploader + AttachmentList
```

Detail-Seiten (`ProjectDetailPage`, `FeatureDetailPage`) werden zu **reinen Ansichtsseiten**: Hero/Stats + „Bearbeiten"-Button, der das Form-Modal öffnet. Alle Verwaltung findet im Modal statt.

---

## Submit-Sequenz im Create-Modus

Beim Absenden eines Create-Formulars läuft folgende serielle Sequenz:

```
1.  Parent-Entität erstellen                → id erhalten
2.  Pending Tasks linken / anlegen
3.  Pending Tickets linken / anlegen
4.  Pending Use Cases linken / anlegen      (nur Feature)
5.  Pending Projekte linken                 (nur Feature)
6.  Pending Subtasks anlegen                (nur Task)
7.  Pending Kommentare anlegen
8.  Pending Notizen anlegen
9.  Pending Dateien hochladen               (sequenziell, mit Fortschrittsanzeige)
```

Schlägt ein Schritt fehl: Fehlermeldung per Toast, Modal wechselt in den **Edit-Modus** der frisch erstellten Entität — der Nutzer sieht was fehlt und kann direkt nachpflegen. Kein Datenverlust, da die Parent-Entität bereits existiert.

Der Speichern-Button zeigt während langer Operationen: „Speichern… (Datei 2 von 5)".

---

## Pending-Datentypen

### In `packages/shared-types/src/index.ts` ergänzen

```typescript
export type DraftTask =
  | { kind: "new"; draft: Pick<TaskInput, "title" | "status" | "priority"> }
  | { kind: "existing"; task: Task };

export type DraftTicket =
  | { kind: "new"; draft: Pick<TicketInput, "title" | "type" | "status" | "priority"> }
  | { kind: "existing"; ticket: Ticket };

export type DraftUseCase =
  | { kind: "new"; draft: Pick<UseCaseInput, "title" | "slug" | "status"> }
  | { kind: "existing"; useCase: UseCase };

export type DraftSubtask = {
  title: string;
  status: TaskStatus;
  priority: Priority;
};

export type DraftComment = {
  text: string;
};

export type DraftNote = {
  title: string;
  contentJson: Record<string, unknown>;
};
```

### In `apps/web/src/types.ts` ergänzen (Frontend-only, `File` ist Browser-API)

```typescript
export type DraftFile = {
  file: File;
  previewUrl?: string;   // URL.createObjectURL(file) für Bildvorschau
};
```

---

## Neue UI-Komponenten (Foundation)

### `PendingRelationList<TItem>` — für Tasks, Tickets, Use Cases, Projekte, Subtasks

Einfache Liste ohne Board/Kanban. Flexible Toolbar — beide Aktionen optional.

```typescript
interface PendingRelationListProps {
  existingItems: Array<{ id: number; title: string; statusLabel?: string; statusTone?: PillTone }>;
  draftItems: Array<{ title: string; badge?: string }>;  // badge z. B. „Wird erstellt"
  emptyIcon: ReactNode;
  emptyTitle: string;
  showLinkExisting?: boolean;     // default true
  showCreateNew?: boolean;        // default true
  linkExistingLabel?: string;     // default „Verknüpfen"
  createNewLabel?: string;        // default „Neu erstellen"
  onLinkExisting?: () => void;
  onCreateNew?: () => void;
  onRemoveExisting: (index: number) => void;
  onRemoveDraft: (index: number) => void;
}
```

Footer-Hinweis immer sichtbar: _„Diese Zuordnungen werden nach dem Speichern verknüpft."_

### `PendingCommentList` — für Kommentare im Create-Modus

Spezialisierte Listenkomponente. Kein „Verknüpfen" (Kommentare können nicht gelinkt werden).

```typescript
interface PendingCommentListProps {
  comments: DraftComment[];
  onAdd: (comment: DraftComment) => void;
  onRemove: (index: number) => void;
}
```

Rendering:
- Inline-Eingabe: `<textarea>` + „Hinzufügen"-Button
- Liste der pending Kommentare mit Vorschautext und Entfernen-Button
- EmptyState wenn leer
- Footer-Hinweis: _„Kommentare werden nach dem Speichern angelegt."_

### `PendingNoteList` — für Notizen im Create-Modus

```typescript
interface PendingNoteListProps {
  notes: DraftNote[];
  onAdd: (note: DraftNote) => void;
  onRemove: (index: number) => void;
}
```

Rendering:
- Button „Neue Notiz" → öffnet Mini-Dialog mit Titel-Input
- Liste pending Notizen mit Titel und Entfernen-Button
- EmptyState wenn leer
- Footer-Hinweis: _„Notizen werden nach dem Speichern angelegt."_

### `PendingFileList` — für Datei-Anhänge im Create-Modus

```typescript
interface PendingFileListProps {
  files: DraftFile[];
  onAdd: (files: DraftFile[]) => void;   // file input onChange → mehrere auf einmal
  onRemove: (index: number) => void;
}
```

Rendering:
- Datei-Auswahl via `<input type="file" multiple>` hinter einem Button „Dateien auswählen"
- Liste pending Dateien: Dateiname, Dateigröße (formatiert), optionale Bildvorschau, Entfernen-Button
- Dateigröße-Validierung: > 25 MB → sofortige Fehlermeldung, Datei nicht in Liste aufnehmen
- EmptyState wenn leer
- Footer-Hinweis: _„Dateien werden nach dem Speichern hochgeladen."_

---

## Schritt 1 — Foundation: Basiskomponenten und Extraktion

**Dateien (neu):**
- `apps/web/src/components/ui/OwnerRelationBoard.tsx`
- `apps/web/src/components/ui/PendingRelationList.tsx`
- `apps/web/src/components/ui/PendingCommentList.tsx`
- `apps/web/src/components/ui/PendingNoteList.tsx`
- `apps/web/src/components/ui/PendingFileList.tsx`
- `apps/web/src/components/tasks/TaskLinkDialog.tsx`
- `apps/web/src/components/tickets/TicketLinkDialog.tsx`

**Shared-types und Web-types:**
- `DraftTask`, `DraftTicket`, `DraftUseCase`, `DraftSubtask`, `DraftComment`, `DraftNote` in `packages/shared-types/src/index.ts`
- `DraftFile` in `apps/web/src/types.ts`

### 1a — `OwnerRelationBoard<TItem>`

Generische stateful Orchestrierungsschicht für n:m-Boards im Edit-Modus. Kapselt Confirm-Dialog, Toast-Feedback und Link-Button. Kein Data-Fetching.

```typescript
interface OwnerRelationBoardProps<TItem extends { id: number }> {
  items: TItem[];
  loading?: boolean;
  onCreateItem: (status?: string) => void;
  onLinkItem: () => void;
  onUnlinkItem: (item: TItem) => Promise<void>;
  onOpenItem: (item: TItem) => void;
  renderListBoardView: (props: RelationBoardViewSlotProps<TItem>) => ReactNode;
  confirmUnlinkTitle: (item: TItem) => string;
  confirmUnlinkBody: (item: TItem) => string;
}

interface RelationBoardViewSlotProps<TItem> {
  items: TItem[];
  loading: boolean;
  onAdd: () => void;
  onAddStatus?: (status: string) => void;
  onOpen: (item: TItem) => void;
  onDelete: (item: TItem) => void;
  linkAction: ReactNode;
}
```

- `linkAction` = Button `<Link2 size={17} />`, variant `"secondary"`, Label „Verknüpfen"
- `onDelete` → `ConfirmDialog` → bei Bestätigung `onUnlinkItem`
- Fehler in `onUnlinkItem` → Error-Toast, kein Silent-Fail

### 1b–1e — Pending-Komponenten

Implementierung gemäß Spezifikation im Abschnitt „Neue UI-Komponenten" oben.

### 1f — `TaskLinkDialog` und `TicketLinkDialog` extrahieren

Inline-Dialoge aus `OwnerTaskBoard.tsx` und `OwnerTicketBoard.tsx` in eigene Dateien auslagern. Props-API und Rendering identisch. Beide erhalten zusätzliche optionale Prop `excludeIds?: number[]`.

**Abnahmekriterien Schritt 1:**
- Alle neuen Dateien existieren, vollständig typisiert, kein `any`
- `tsc --noEmit` ohne Fehler
- Bestehende Boards noch unverändert funktionsfähig

---

## Schritt 2 — `OwnerTaskBoard` und `OwnerTicketBoard` auf `OwnerRelationBoard` migrieren

**Dateien (ändern):**
- `apps/web/src/components/tasks/OwnerTaskBoard.tsx`
- `apps/web/src/components/tickets/OwnerTicketBoard.tsx`

Inline-`confirm()`-Aufrufe und Toast-Handling entfernen — liegt jetzt in `OwnerRelationBoard`. Extrahierte Link-Dialoge importieren.

Nach der Migration: `grep -r "OwnerTaskBoard\|OwnerTicketBoard\|TaskLinkDialog\|TicketLinkDialog"` — alle Fundstellen prüfen, Imports aktualisieren.

Erwartete Fundstellen:
- `ProjectDetailPage` → `OwnerTaskBoard`, `ProjectTicketPanel` (→ `OwnerTicketBoard`)
- `FeatureDetailPage` → `OwnerTaskBoard`, `OwnerTicketBoard`
- `UseCaseForm` → `OwnerTaskBoard`, `OwnerTicketBoard`
- `TaskDetail` → `OwnerTicketBoard`

**Abnahmekriterien Schritt 2:**
- Kein inline `confirm()`-Aufruf mehr in den migrierten Boards
- `tsc --noEmit` ohne Fehler
- `npm run test -w apps/web` grün
- Playwright `owner-tasks.spec.ts` und `tickets.spec.ts` grün

---

## Schritt 3 — UseCase: vollständige Pending-Tabs im Create-Modus

**Dateien (ändern):**
- `apps/web/src/components/usecases/UseCaseForm.tsx`
- `apps/web/src/pages/FeatureDetailPage.tsx`

### Tabs (immer alle anzeigen)

```typescript
type UseCaseFormTab = "details" | "tasks" | "tickets" | "comments";

const tabs: Array<Tab<UseCaseFormTab>> = [
  { value: "details",   label: "Stammdaten" },
  { value: "tasks",     label: "Aufgaben" },
  { value: "tickets",   label: "Tickets" },
  { value: "comments",  label: "Kommentare" },
];
```

### Neuer lokaler State

```typescript
const [pendingTasks,    setPendingTasks]    = useState<DraftTask[]>([]);
const [pendingTickets,  setPendingTickets]  = useState<DraftTicket[]>([]);
const [pendingComments, setPendingComments] = useState<DraftComment[]>([]);
// Dialog-States
const [taskLinkOpen,    setTaskLinkOpen]    = useState(false);
const [ticketLinkOpen,  setTicketLinkOpen]  = useState(false);
const [taskDraftOpen,   setTaskDraftOpen]   = useState(false);
const [ticketDraftOpen, setTicketDraftOpen] = useState(false);
```

State-Reset im `useEffect` wenn `open` → false.

### Tab-Rendering

| Tab | Create-Modus | Edit-Modus |
|---|---|---|
| Stammdaten | Formularfelder | Formularfelder |
| Aufgaben | `PendingRelationList` | `OwnerTaskBoard` |
| Tickets | `PendingRelationList` | `OwnerTicketBoard` |
| Kommentare | `PendingCommentList` | `CommentThread` |

### Mini-Draft-Dialoge

- `TaskDraftDialog`: Modal mit Titel (required), Status-RadioList, Priorität-RadioList
- `TicketDraftDialog`: Modal mit Titel (required), Typ-Select, Status-RadioList, Priorität-RadioList
- Lokale Funktionskomponenten oder eigene Dateien wenn > 80 Zeilen. Kein API-Aufruf.

### Props-Erweiterung

```typescript
onPostCreate?: (useCaseId: number, pending: {
  tasks: DraftTask[];
  tickets: DraftTicket[];
  comments: DraftComment[];
}) => Promise<void>;
```

`onSubmit` Rückgabetyp ändert sich auf `Promise<UseCase | void>`.

### FeatureDetailPage

Implementiert `onPostCreate` für alle Pending-Typen. Verwendet die entsprechenden API-Funktionen aus `src/api/`.

**Abnahmekriterien Schritt 3:**
- Alle 4 Tabs im Create- und Edit-Modus sichtbar
- Create-Modus: kein API-Aufruf vor Submit
- Submit: UseCase erstellt → Tasks/Tickets/Kommentare nachgelinkt/angelegt
- Bei Teilfehler: Toast, Modal bleibt im Edit-Modus der neuen UseCase offen
- `tsc --noEmit` ohne Fehler

---

## Schritt 4 — Task: `TaskForm` und `TaskDetail` zu `TaskModal` zusammenführen

**Datei (neu):** `apps/web/src/components/tasks/TaskModal.tsx`  
**Dateien (entfernen nach vollständiger Migration):** `TaskForm.tsx`, `TaskDetail.tsx`

### Props

```typescript
interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  initialStatus?: TaskStatus;
  onSubmit: (input: TaskModalInput) => Promise<Task | void>;
  onClose: () => void;
  onChanged?: () => Promise<void>;
}

export interface TaskModalInput extends TaskInput {
  tagIds: number[];
  pendingSubtasks: DraftSubtask[];
  pendingTickets: DraftTicket[];
  pendingComments: DraftComment[];
  pendingNotes: DraftNote[];
  pendingFiles: DraftFile[];
}
```

### Tabs

| Tab | Create-Modus | Edit-Modus |
|---|---|---|
| Details | Formularfelder | Formularfelder |
| Subtasks | `PendingRelationList` (nur „Neu erstellen") | `SubtaskList` |
| Tickets | `PendingRelationList` | `OwnerTicketBoard` |
| Kommentare | `PendingCommentList` | `CommentThread` |
| Notizen | `PendingNoteList` | `NoteList` + `NoteEditor` |
| Dateien | `PendingFileList` | `AttachmentUploader` + `AttachmentList` |

### Subtask-Draft-Dialog

Lokale Funktionskomponente: Titel (required), Status-RadioList. Kein API-Aufruf.

### Submit-Sequenz in `OwnerTaskBoard`

`OwnerTaskBoard` verarbeitet alle Pending-Felder nach dem Erstellen:

```typescript
const { tagIds, pendingSubtasks, pendingTickets,
        pendingComments, pendingNotes, pendingFiles, ...taskInput } = input;
const created = await taskController.createTask(taskInput);
if (tagIds.length > 0) await setTaskTags(created.id, tagIds);
for (const sub of pendingSubtasks)
  await createSubtask(created.id, sub);
for (const draft of pendingTickets)
  draft.kind === "existing"
    ? await linkTaskTicket(created.id, draft.ticket.id)
    : await linkTaskTicket(created.id, (await createBareTicket(draft.draft)).id);
for (const c of pendingComments)
  await createComment("task", created.id, c);
for (const n of pendingNotes)
  await createNote({ type: "task", id: created.id }, n);
for (const f of pendingFiles)
  await uploadAttachment({ type: "task", id: created.id }, f.file);
await taskController.reload();
```

Bei Teilfehler: Toast, Board zeigt neue Task, kein Datenverlust.

### Migration aller Aufrufer

`grep -r "TaskForm\|TaskDetail"` — alle Fundstellen auf `TaskModal` umstellen.

**Abnahmekriterien Schritt 4:**
- `TaskModal` deckt alle 6 Tabs in Create und Edit ab
- Alle Aufrufer migriert, `TaskForm.tsx` und `TaskDetail.tsx` entfernt
- Submit Create: Task → Subtasks → Tickets → Kommentare → Notizen → Dateien
- Bei Datei-Upload: Fortschrittsanzeige im Speichern-Button
- `tsc --noEmit` ohne Fehler
- Playwright `task.spec.ts` und `owner-tasks.spec.ts` grün

---

## Schritt 5 — Feature: `FeatureForm` zur vollständigen Form ausbauen

**Dateien (ändern):**
- `apps/web/src/components/features/FeatureForm.tsx`
- `apps/web/src/pages/FeatureDetailPage.tsx`
- `apps/web/src/pages/ProjectDetailPage.tsx`

### Props

```typescript
interface FeatureFormProps {
  open: boolean;
  feature?: Feature | null;
  onSubmit: (input: FeatureInput) => Promise<Feature | void>;
  onClose: () => void;
  onDelete?: (feature: Feature) => Promise<boolean>;
  onPostCreate?: (featureId: number, pending: {
    tasks: DraftTask[];
    tickets: DraftTicket[];
    useCases: DraftUseCase[];
    projectIds: number[];
    comments: DraftComment[];
    files: DraftFile[];
  }) => Promise<void>;
}
```

### Tabs

| Tab | Create-Modus | Edit-Modus |
|---|---|---|
| Details | Titel, Slug, Status, Sortierung, Kurzbeschreibung, Inhalt | gleich |
| Use Cases | `PendingRelationList` (Link + Neu: Titel/Slug/Status) | `UseCaseListBoardView` + `UseCaseForm` |
| Aufgaben | `PendingRelationList` | `OwnerTaskBoard` |
| Tickets | `PendingRelationList` | `OwnerTicketBoard` |
| Projekte | `PendingRelationList` (nur Link, kein Neu) | `FeatureProjectPanel` |
| Kommentare | `PendingCommentList` | `CommentThread` |
| Dateien | `PendingFileList` | `AttachmentUploader` + `AttachmentList` |

Hinweis: Notizen sind in der aktuellen Codebase für Features nicht vorhanden (`useNotes` gibt es nur für project/task/ticket). Tab „Notizen" wird nur ergänzt, wenn der Datentyp im Backend unterstützt wird. Andernfalls im Log als offener Punkt dokumentieren.

Löschen-Button im Edit-Modus im `footerStart` des `FormModal`.

### `FeatureDetailPage` → reine Ansichtsseite

Zeigt:
- Hero-Header mit Stats (Status, Use-Case-Anzahl, Sortierung, Aktualisiert)
- Breadcrumb
- Button „Bearbeiten" → öffnet `FeatureForm` Modal

Alle bisherigen Tab-Panels werden entfernt. Nicht mehr benötigte Hooks (`useUseCases`, `useTasks`, `useTickets`, `useAttachments`, `useEntityComments`, `useFeatureProjectLinks`) entfernen.

**Abnahmekriterien Schritt 5:**
- `FeatureForm` zeigt alle Tabs in Create und Edit
- `FeatureDetailPage`: nur Hero + „Bearbeiten"-Button, kein Tab-Interface
- Create-Feature von `ProjectDetailPage`: alle Pending-Items nachgelinkt
- Löschen-Button im Edit-Modus
- `tsc --noEmit` ohne Fehler
- Playwright `feature.spec.ts` grün

---

## Schritt 6 — Project: `ProjectForm` und `ProjectInlineForm` konsolidieren

**Dateien (ändern):**
- `apps/web/src/components/projects/ProjectForm.tsx`
- `apps/web/src/pages/ProjectDetailPage.tsx`
- `apps/web/src/pages/ProjectsPage.tsx`

**Datei (entfernen nach Migration):** `apps/web/src/components/projects/ProjectInlineForm.tsx`

### Props

```typescript
interface ProjectFormProps {
  open: boolean;
  project?: Project | null;
  onSubmit: (input: ProjectInput, tagIds: number[]) => Promise<Project | void>;
  onClose: () => void;
  onDelete?: (project: Project) => Promise<boolean>;
  onPostCreate?: (projectId: number, pending: {
    tasks: DraftTask[];
    tickets: DraftTicket[];
    featureIds: number[];
    comments: DraftComment[];
    notes: DraftNote[];
    files: DraftFile[];
  }) => Promise<void>;
}
```

### Tabs

| Tab | Create-Modus | Edit-Modus |
|---|---|---|
| Details | Name, Kürzel (auto), Beschreibung, Farbe, Status, Start, Fällig, Tags | gleich |
| Features | `PendingRelationList` (nur Link) | `ProjectFeaturePanel` |
| Aufgaben | `PendingRelationList` | `OwnerTaskBoard` |
| Tickets | `PendingRelationList` | `OwnerTicketBoard` |
| Kommentare | `PendingCommentList` | `CommentThread` |
| Notizen | `PendingNoteList` | `NoteList` + `NoteEditor` |
| Dateien | `PendingFileList` | `AttachmentUploader` + `AttachmentList` |
| Backlog | ausgeblendet im Create-Modus¹ | `BacklogListBoardView` |
| Import | ausgeblendet im Create-Modus² | `WikiImportPanel` |

¹ Backlog-Items sind komplexe strukturierte Datenstrukturen mit Feature/UseCase-Bezug — sinnvoll erst nach Projektanlage. Tab im Create-Modus mit Hinweistext: _„Backlog ist nach dem Speichern verfügbar."_

² Wiki-Import ist ein einmaliger Prozess mit Vorschau und erfordert eine persistente Projekt-ID. Tab im Create-Modus ausgeblendet.

### `ProjectDetailPage` → reine Ansichtsseite

Zeigt:
- Hero-Header mit Stats (Fortschritt, Aufgaben, Offen, Backlog, Aktualisiert)
- Breadcrumb
- Button „Bearbeiten" → öffnet `ProjectForm` Modal

Alle bisherigen Tab-Panels entfernen. `ProjectInlineForm` danach löschen.

**Abnahmekriterien Schritt 6:**
- `ProjectForm` zeigt alle Tabs in Create und Edit (außer Backlog/Import im Create-Modus)
- `ProjectDetailPage`: nur Hero + „Bearbeiten"-Button
- `ProjectInlineForm` vollständig entfernt, kein Import davon mehr vorhanden
- `tsc --noEmit` ohne Fehler
- `npm run test -w apps/web` grün
- Playwright `project.spec.ts` grün

---

## Schritt 7 — Vollständiger Build- und Typecheck-Lauf

Serielle Ausführung, jedes Ergebnis berichten:

```bash
npm run typecheck -w apps/web
npm run typecheck -w apps/api
npm run lint
npm run build -w apps/web
npm run build -w apps/api
```

Toleriert: Vite-Chunk-Size-Warnung. Alle anderen Fehler müssen vor Schritt 8 behoben sein.

---

## Schritt 8 — Unit-Tests: Foundation-Komponenten

**Dateien (neu):**
- `apps/web/src/components/ui/__tests__/OwnerRelationBoard.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingRelationList.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingCommentList.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingNoteList.test.tsx`
- `apps/web/src/components/ui/__tests__/PendingFileList.test.tsx`

### `OwnerRelationBoard.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - renderListBoardView-Slot wird mit items, loading und linkAction aufgerufen.
 * - onAdd im Slot → onCreateItem() aufgerufen.
 * - linkAction geklickt → onLinkItem() aufgerufen.
 * - onDelete im Slot → ConfirmDialog erscheint mit konfigurierten Texten.
 * - Bestätigung → onUnlinkItem(item) aufgerufen.
 * - Abbrechen → onUnlinkItem nicht aufgerufen.
 * - Fehler in onUnlinkItem → Error-Toast sichtbar, kein weiterer Aufruf.
 * - onOpen im Slot → onOpenItem(item) aufgerufen.
 * Ziel: Orchestrierungslogik absichern.
 */
```

Mindestens 8 Testfälle.

### `PendingRelationList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn beide Listen leer.
 * - Kein EmptyState wenn existingItems vorhanden.
 * - Kein EmptyState wenn draftItems vorhanden.
 * - Footer-Hinweis immer sichtbar.
 * - showLinkExisting=false: „Verknüpfen"-Button nicht sichtbar.
 * - showCreateNew=false: „Neu erstellen"-Button nicht sichtbar.
 * - „Verknüpfen" → onLinkExisting() aufgerufen.
 * - „Neu erstellen" → onCreateNew() aufgerufen.
 * - Entfernen Existing-Item → onRemoveExisting(korrekter Index) aufgerufen.
 * - Entfernen Draft-Item → onRemoveDraft(korrekter Index) aufgerufen.
 * Ziel: PendingRelationList-Rendering und Interaktionen absichern.
 */
```

Mindestens 10 Testfälle.

### `PendingCommentList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Kommentare pending.
 * - Footer-Hinweis immer sichtbar.
 * - Text eingeben + Hinzufügen → onAdd() mit korrektem DraftComment aufgerufen.
 * - Leeres Textfeld: Hinzufügen-Button disabled oder Aufruf verhindert.
 * - Entfernen → onRemove(index) aufgerufen.
 * - Nach Hinzufügen: Textfeld geleert.
 */
```

Mindestens 6 Testfälle.

### `PendingNoteList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Notizen pending.
 * - Footer-Hinweis sichtbar.
 * - „Neue Notiz" → Mini-Dialog öffnet sich.
 * - Titel eingeben + Bestätigen → onAdd() mit korrekter DraftNote aufgerufen.
 * - Leerer Titel: Bestätigen-Button disabled.
 * - Entfernen → onRemove(index) aufgerufen.
 */
```

Mindestens 6 Testfälle.

### `PendingFileList.test.tsx`

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - EmptyState wenn keine Dateien pending.
 * - Footer-Hinweis sichtbar.
 * - Datei auswählen → onAdd() mit korrekten DraftFiles aufgerufen.
 * - Datei > 25 MB → onAdd nicht aufgerufen, Fehlermeldung sichtbar.
 * - Entfernen → onRemove(index) aufgerufen.
 * - Dateiname und Dateigröße formatiert sichtbar.
 */
```

Mindestens 6 Testfälle.

**Abnahmekriterien Schritt 8:**
- Alle Testfälle aller 5 Dateien grün
- Test-Scope-Kommentar in jeder Datei vollständig
- Kein `test.skip`, kein leerer Test-Body

---

## Schritt 9 — Unit-Tests: Unified Form-Komponenten

**Dateien (neu):**
- `apps/web/src/components/usecases/__tests__/UseCaseForm.test.tsx`
- `apps/web/src/components/tasks/__tests__/TaskModal.test.tsx`
- `apps/web/src/components/features/__tests__/FeatureForm.test.tsx`
- `apps/web/src/components/projects/__tests__/ProjectForm.test.tsx`

Jede Test-Datei deckt ab:

```
Create-Modus:
 1. Alle Relation-Tabs sichtbar (Aufgaben, Tickets, Kommentare, ...)
 2. PendingRelationList in Relation-Tab sichtbar (kein Board)
 3. PendingCommentList im Kommentare-Tab sichtbar
 4. PendingFileList im Dateien-Tab sichtbar (sofern Tab vorhanden)
 5. Verknüpfen → kein API-Aufruf vor Submit
 6. Neu erstellen → Draft in Pending-Liste
 7. Pending-Item entfernen → aus Liste verschwunden
 8. Submit → onSubmit aufgerufen → onPostCreate mit allen Pending-Daten aufgerufen
 9. Schließen + neu öffnen → alle Pending-Listen leer

Edit-Modus:
10. OwnerTaskBoard / OwnerTicketBoard in Relation-Tabs sichtbar
11. CommentThread im Kommentare-Tab sichtbar
12. AttachmentList im Dateien-Tab sichtbar
```

Vollständiger Test-Scope-Kommentar Pflicht.

**Abnahmekriterien Schritt 9:**
- Alle Testfälle grün
- In Create-Tests: kein API-Aufruf-Mock vor Submit ausgelöst
- Kein `test.skip`, kein leerer Test-Body

---

## Schritt 10 — API-Integrationstests: Isolations- und Negativtests

**Dateien (erweitern):**
- `apps/api/tests/integration/owner-task-relations.test.ts`
- `apps/api/tests/integration/tickets.test.ts`

### Task-Isolation (mindestens 7 Testfälle)

```typescript
/**
 * Neue Testgruppe: Task-Isolation zwischen Ownern
 * Abgedeckte Regeln:
 * - Task von Owner A erscheint NICHT in Task-Liste von Owner B (gleicher Typ).
 * - Task von Owner A erscheint NICHT in Task-Liste von Owner B (anderer Typ).
 * - Task nach Unlink aus Owner A: Liste leer, GET /api/tasks enthält Task noch.
 * - Task in Projekt A UND Feature B: in beiden Owner-Listen sichtbar (n:m).
 * Fehlerfälle:
 * - Link mit nicht existierender Task-ID → 404.
 * - Link mit nicht existierendem Owner → 404.
 * - Unlink ohne bestehende Verknüpfung → 404.
 */
```

### Ticket-Isolation (mindestens 5 Testfälle)

Analog, für alle vier Ticket-Owner-Typen (project, task, feature, useCase).

**Abnahmekriterien Schritt 10:**
- Alle neuen Testfälle grün
- Bestehende Testfälle unverändert grün

---

## Schritt 11 — E2E-Tests: Vollständige Coverage

**Dateien (erweitern):**
- `apps/web/e2e/owner-tasks.spec.ts`
- `apps/web/e2e/tickets.spec.ts`

**Dateien (neu):**
- `apps/web/e2e/feature-form.spec.ts`
- `apps/web/e2e/project-form.spec.ts`

### Ergänzungen in `owner-tasks.spec.ts`

```
1. Isolationstest: Task aus Projekt A erscheint NICHT in Aufgaben-Tab von Projekt B
2. Pending Create (UseCase): Task vormerken → nach Speichern in UseCase-Aufgaben-Tab
3. Pending Create (UseCase): Kommentar vormerken → nach Speichern im Kommentare-Tab
4. Pending Create (Task): Ticket vormerken → nach Speichern in Task-Ticket-Tab
5. Pending Create (Task): Datei vormerken → nach Speichern in Dateien-Tab sichtbar
```

### Ergänzungen in `tickets.spec.ts`

```
6. Isolationstest: Ticket aus Projekt A erscheint NICHT in Ticket-Tab von Projekt B
```

### `feature-form.spec.ts` (neu)

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - FeatureForm Create-Modus: Use Cases, Aufgaben, Tickets, Projekte, Kommentare, Dateien-Tabs sichtbar.
 * - Create: Aufgabe vormerken → nach Speichern in Feature-Aufgaben-Tab.
 * - Create: Kommentar vormerken → nach Speichern im Kommentare-Tab.
 * - Edit: OwnerTaskBoard sichtbar, Aufgabe direkt anlegen.
 * - FeatureDetailPage zeigt nur Hero + Bearbeiten-Button.
 * - Löschen-Button im Edit-Modus vorhanden.
 */
```

Mindestens 6 Testfälle.

### `project-form.spec.ts` (neu)

```typescript
/**
 * Test Scope:
 * Abgedeckte Regeln:
 * - ProjectForm Create-Modus: Features, Aufgaben, Tickets, Kommentare, Notizen, Dateien-Tabs sichtbar.
 * - Backlog-Tab im Create-Modus zeigt Hinweistext statt Formular.
 * - Create: Aufgabe vormerken → nach Speichern in Projekt-Aufgaben-Tab.
 * - Create: Notiz vormerken → nach Speichern in Notizen-Tab.
 * - Edit: alle Tabs inkl. Backlog und Import vorhanden.
 * - ProjectDetailPage zeigt nur Hero + Bearbeiten-Button.
 * - Löschen-Button im Edit-Modus vorhanden.
 */
```

Mindestens 7 Testfälle.

**Abnahmekriterien Schritt 11:**
- Alle neuen E2E-Tests grün
- Isolationstests: explizite `expect(...).toHaveCount(0)` für das fehlende Item
- Pending-Tests: Reload-Prüfung nach Submit (Persistenz bestätigt)
- Alle bestehenden E2E-Tests noch grün

---

## Abschluss-Checkliste (nach Schritt 11)

```
npm run typecheck -w apps/web      → ✅ Keine Fehler
npm run typecheck -w apps/api      → ✅ Keine Fehler
npm run lint                       → ✅ Keine Fehler
npm run build -w apps/web          → ✅ Kein Fehler (Chunk-Warnung toleriert)
npm run test -w apps/api           → ✅ Alle Tests grün
npm run test -w apps/web           → ✅ Alle Tests grün
Playwright owner-tasks.spec.ts     → ✅ Alle Tests grün
Playwright tickets.spec.ts         → ✅ Alle Tests grün
Playwright feature-form.spec.ts    → ✅ Alle Tests grün
Playwright project-form.spec.ts    → ✅ Alle Tests grün
Playwright project.spec.ts         → ✅ Alle Tests grün
Playwright feature.spec.ts         → ✅ Alle Tests grün
Playwright task.spec.ts            → ✅ Alle Tests grün
```

---

## Blocker-Verhalten

- Blocker → Schritt-Log `⚠️` oder `🔴`, konkrete Beschreibung, dann nächsten unabhängigen Schritt beginnen
- Bekannte Vorläufer (`freshness.spec.ts`-Timeouts, `TaskPositionInput`-Inkonsistenz) → im Log dokumentieren, nicht reparieren
- Vollständiger Abbruch nur wenn alle verbleibenden Schritte blockiert sind — muss explizit begründet werden

---

## Arbeitsreihenfolge

| Schritt | Kurztitel | Abhängig von |
|---|---|---|
| 1 | Foundation: Komponenten, Typen, Dialog-Extraktion | — |
| 2 | Migration OwnerTaskBoard + OwnerTicketBoard | 1 |
| 3 | UseCase: vollständige Pending-Tabs | 1, 2 |
| 4 | Task: TaskModal (Create + Edit vereint) | 1, 2 |
| 5 | Feature: FeatureForm vollständig, DetailPage → Ansicht | 1, 2 |
| 6 | Project: ProjectForm vollständig, DetailPage → Ansicht | 1, 2 |
| 7 | Build + Typecheck-Lauf | 3, 4, 5, 6 |
| 8 | Unit-Tests Foundation-Komponenten | 1 |
| 9 | Unit-Tests Unified Forms | 3, 4, 5, 6 |
| 10 | API-Integrationstests Isolation | — |
| 11 | E2E-Tests vollständig | 3, 4, 5, 6 |

Schritte 3, 4, 5, 6 sind untereinander unabhängig und können in beliebiger Reihenfolge bearbeitet werden.
Schritte 8, 9, 10, 11 sind untereinander unabhängig.
