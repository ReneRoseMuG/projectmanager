# Codex-Auftrag: Neue Basiskomponente `OwnerRelationBoard` für n:m-Beziehungen

## Ziel

Eine generische UI-Komponente `OwnerRelationBoard<TItem>` erstellen, die den vollständigen stateful Orchestrierungs-Muster (Create Child, Link Existing, Remove/Unlink, Detail-Ansicht) für beliebige n:m-Beziehungen zwischen einem Parent-Objekt und beliebigen Domain-Objekten kapselt. Anschließend werden alle bestehenden `OwnerTaskBoard`- und `OwnerTicketBoard`-Vorkommen auf diese Basis migriert.

---

## Kontext

Die App enthält für jede Domain-Klasse, die über n:m-Beziehungen an ein Parent-Objekt gebunden wird, eine fast identische stateful Orchestrierungs-Komponente. Derzeit existieren:

- `apps/web/src/components/tasks/OwnerTaskBoard.tsx`  
- `apps/web/src/components/tickets/OwnerTicketBoard.tsx`

Beide folgen identischer Struktur:
1. State: Create-Form offen/geschlossen, Status für neue Items, Detail-Modal, Link-Dialog
2. `+ Button` → öffnet Create-Form (Create Child)
3. `secondaryAction` Link-Icon-Button → öffnet Link-Dialog (Link Existing / Create Relation)
4. `onDelete` auf Cards → `unlinkItem(id)` mit Confirm-Dialog (Remove Item/Relation)
5. Detail-Modal für Item-Ansicht

Beide nutzen `TaskListBoardView` bzw. `TicketListBoardView`, die ihrerseits auf der generischen `ListBoardView` aufbauen. Die `FeatureProjectPanel`-Komponente folgt demselben logischen Muster, ist aber inline implementiert.

**DB-Tabellen mit n:m-Beziehungen (owner → item):**
- `projectTasks` (project → task)
- `featureTasks` (feature → task)
- `useCaseTasks` (useCase → task)
- `projectTickets` (project → ticket)
- `taskTickets` (task → ticket)
- `featureTickets` (feature → ticket)
- `useCaseTickets` (useCase → ticket)

---

## Teil 1 — Neue Basiskomponente

### 1.1 — `OwnerRelationBoard<TItem>` erstellen

Datei: `apps/web/src/components/ui/OwnerRelationBoard.tsx`

Die Komponente ist eine generische, stateful Orchestrierungs-Schicht. Sie kapselt alle modalen Zustände und delegiert Rendering vollständig an typisierte Props-Callbacks.

```tsx
interface OwnerRelationBoardProps<TItem extends { id: number }> {
  // --- Daten & Ladestand ---
  items: TItem[];
  loading?: boolean;

  // --- Item-Aktionen (vom Hook des Aufrufers bereitgestellt) ---
  onCreateItem: (status?: string) => void;   // öffnet Create-Form im Parent
  onLinkItem: () => void;                    // öffnet Link-Dialog im Parent
  onUnlinkItem: (item: TItem) => void;       // Remove/Unlink mit Confirm-Dialog
  onOpenItem: (item: TItem) => void;         // öffnet Detail-Modal

  // --- Render-Slots ---
  renderListBoardView: (props: RelationBoardViewSlotProps<TItem>) => ReactNode;

  // --- Labels für Confirm-Dialog ---
  confirmUnlinkTitle: (item: TItem) => string;
  confirmUnlinkBody: (item: TItem) => string;
}

interface RelationBoardViewSlotProps<TItem> {
  items: TItem[];
  loading: boolean;
  onAdd: () => void;                         // → onCreateItem()
  onAddStatus?: (status: string) => void;    // → onCreateItem(status)
  onOpen: (item: TItem) => void;
  onDelete: (item: TItem) => void;           // → triggers Confirm → onUnlinkItem()
  linkAction: ReactNode;                     // vorgefertigter Link-Icon-Button
}
```

**Pflichtverhalten:**
- `+` Button im `renderListBoardView`-Slot ruft `onAdd` auf → `onCreateItem()` (Create Child)
- Link-Icon-Button (wird als `linkAction` ReactNode übergeben, Icon: `<Link2 size={17} />`, variant: `"secondary"`, Label: "Verknüpfen") → `onLinkItem()` (Create Relation)
- `onDelete` auf Items → öffnet `ConfirmDialog` mit `confirmUnlinkTitle`/`confirmUnlinkBody` → bei Bestätigung `onUnlinkItem(item)` aufrufen
- Toast-Feedback für Unlink-Fehler via `useToast()`
- Confirm-Dialog via `useConfirm()`

**Was die Komponente NICHT tut:**
- Kein eigenes Formular, kein eigener Link-Dialog, kein eigenes Detail-Modal — diese werden vom Aufrufer gerendert, da sie domain-spezifisch sind
- Kein eigener Data-Fetching — Items kommen via Props

### 1.2 — Trash-Icon-Rendering in den Cards

`TaskCard` und `TicketCard` haben `onDelete?: (item) => void` bereits vollständig implementiert — in beiden Varianten (`"card"` über `ItemCard.onDelete` und `"row"` über `ItemRow.actions` mit `<Trash2>`). **Hier gibt es nichts zu ändern.** Der `OwnerRelationBoard` ruft lediglich `onDelete` über den Slot `RelationBoardViewSlotProps.onDelete` auf, was von den domain-spezifischen Views direkt an die Cards weitergereicht wird — genau wie heute bereits in `OwnerTaskBoard` und `OwnerTicketBoard`.

---

## Teil 2 — Migration aller Domain-Vorkommen

### 2.1 — `OwnerTaskBoard` auf `OwnerRelationBoard` migrieren

Datei: `apps/web/src/components/tasks/OwnerTaskBoard.tsx`

**Vorher** (aktuell): Kompletter stateful Orchestrator (ca. 200 Zeilen) mit inline `TaskLinkDialog`.

**Nachher**: Schlanker Wrapper, der `OwnerRelationBoard` nutzt:

```tsx
export function OwnerTaskBoard({ owner }: { owner: TaskOwner }) {
  const taskController = useTasks(owner);
  const { viewMode, setViewMode } = useViewMode();
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("todo");
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  return (
    <>
      <OwnerRelationBoard
        items={taskController.tasks}
        loading={taskController.loading}
        onCreateItem={(status) => {
          setNewTaskStatus((status as TaskStatus) ?? "todo");
          setTaskFormOpen(true);
        }}
        onLinkItem={() => setLinkDialogOpen(true)}
        onUnlinkItem={async (task) => { await taskController.unlinkTask(task.id); }}
        onOpenItem={(task) => setDetailTaskId(task.id)}
        confirmUnlinkTitle={(task) => "Zuordnung entfernen?"}
        confirmUnlinkBody={(task) => `Die Aufgabe "${task.title}" wird nur aus diesem Bereich entfernt.`}
        renderListBoardView={(slotProps) => (
          <TaskListBoardView
            tasks={slotProps.items}
            loading={slotProps.loading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onAdd={slotProps.onAdd}
            onAddStatus={slotProps.onAddStatus}
            onOpen={slotProps.onOpen}
            onDelete={slotProps.onDelete}
            linkAction={slotProps.linkAction}
          />
        )}
      />
      <TaskForm ... />
      <TaskLinkDialog ... />
      <TaskDetail ... />
    </>
  );
}
```

`TaskLinkDialog` aus der Inline-Definition im `OwnerTaskBoard` in eine eigene Datei extrahieren:  
`apps/web/src/components/tasks/TaskLinkDialog.tsx`

### 2.2 — `OwnerTicketBoard` auf `OwnerRelationBoard` migrieren

Datei: `apps/web/src/components/tickets/OwnerTicketBoard.tsx`

Analoges Vorgehen wie 2.1. `TicketLinkDialog` in eigene Datei extrahieren:  
`apps/web/src/components/tickets/TicketLinkDialog.tsx`

### 2.3 — Alle Verwendungsstellen prüfen und anpassen

Mit `grep -r "OwnerTaskBoard\|OwnerTicketBoard"` alle Aufruf-Stellen finden. Erwartete Fundstellen:
- `apps/web/src/components/tasks/ProjectTaskPanel.tsx` oder ähnlich (sofern vorhanden)
- `apps/web/src/pages/ProjectDetailPage.tsx`
- `apps/web/src/pages/FeatureDetailPage.tsx`
- `apps/web/src/components/features/FeatureProjectPanel.tsx` (prüfen, ob es ein OwnerBoard nutzt oder direkt ListBoardView)
- `apps/web/src/components/tickets/ProjectTicketPanel.tsx` → nutzt `OwnerTicketBoard`

Jede Fundstelle: Sicherstellen, dass nach der Migration das Verhalten identisch ist (Create, Link, Unlink, Detail).

### 2.4 — `FeatureProjectPanel` prüfen

`FeatureProjectPanel` implementiert das gleiche logische Muster (ListBoardView + n:m Add/Remove), ist aber inline mit eigenem `FormModal` für "Projekt hinzufügen". Dieses Panel ist kein `OwnerRelationBoard`-Kandidat, da es heterogene Parent-Child-Typen verwaltet (Feature → Projekte, nicht über einen `owner`-Hook). **Nicht migrieren** — nur sicherstellen, dass der Trash-Icon-Button (`Trash2`) konsistent vorhanden ist (bereits vorhanden in `FeatureProjectRow`/`FeatureProjectCard`).

---

## Regeln & Einschränkungen

1. `OwnerRelationBoard` ist eine reine UI-Orchestrierungsschicht ohne Data-Fetching.
2. Der `+` Button im `renderListBoardView`-Slot **muss** `onAdd()` aufrufen — Create Child, kein Dropdown.
3. Der Link-Icon-Button (`linkAction`) wird von `OwnerRelationBoard` als fertiger Button erzeugt und in den Slot weitergegeben — der Aufrufer rendert ihn nicht selbst.
4. `onDelete` auf Items triggert immer einen Confirm-Dialog innerhalb von `OwnerRelationBoard` bevor `onUnlinkItem` aufgerufen wird.
5. Die domain-spezifischen `*ListBoardView`-Komponenten (`TaskListBoardView`, `TicketListBoardView`) bleiben unverändert in ihrer Struktur — nur die Aufrufer ändern sich.
6. Keine Breaking Changes an der `ListBoardView`-Props-API.
7. TypeScript: `OwnerRelationBoard` ist vollständig generisch typisiert (`TItem extends { id: number }`).

---

## Randfälle & Fehlerpfade

- **Unlink schlägt fehl**: Toast mit Fehlermeldung zeigen, kein Silent-Fail.  
- **Link-Dialog öffnet sich aber kein Item vorhanden**: Leerzustand im Dialog (`EmptyState`) — bereits in `TaskLinkDialog` vorhanden, beibehalten.  
- **Create-Form Fehler**: Fehlermeldung via Toast, Form bleibt offen — bereits implementiert in beiden Boards, beibehalten.  
- **Owner noch nicht initialisiert (id = NaN)**: `useTasks`/`useTickets` haben bereits eine Guard-Logik (`validOwner`-Check) — nicht anfassen.  
- **Concurrent Unlink**: Mehrere Items gleichzeitig entfernen ist kein Szenario — kein Loading-State pro Item nötig (aktuell auch nicht vorhanden).
- **`onAddStatus` nicht verfügbar**: `OwnerRelationBoard` gibt `onAddStatus` optional weiter — wenn der Domain-Hook keine Status-aware Create-Funktion hat, kann `undefined` übergeben werden.

---

## Seiteneffekte

- `TaskLinkDialog` und `TicketLinkDialog` werden zu eigenständigen exportierten Komponenten — alle Tests, die diese inline referenzieren, müssen den neuen Import-Pfad nutzen.
- Der `OwnerRelationBoard`-Slot `renderListBoardView` erhält als `onDelete` eine Funktion, die intern einen Confirm-Dialog öffnet. Das bedeutet: die domain-spezifischen Views (`TaskListBoardView`, `TicketListBoardView`) delegieren `onDelete` unverändert nach oben — dieses Verhalten ist bereits vorhanden.
- Tests in `apps/web/src/components/ui/__tests__/TaskListBoardView.test.tsx` bleiben unverändert, da `TaskListBoardView` selbst nicht geändert wird.

---

## Testhinweise

Nach der Migration verifizieren:

1. **Create Child**: `+` Button in `OwnerTaskBoard` öffnet `TaskForm` → Aufgabe wird erstellt und im Board angezeigt.
2. **Link Existing**: Link-Icon-Button öffnet `TaskLinkDialog` → Item erscheint im Board nach Verknüpfung.
3. **Unlink**: Trash-Icon auf einem Item → Confirm-Dialog erscheint → bei Bestätigung verschwindet Item aus der Liste.
4. **Unlink-Abbruch**: Trash-Icon → Confirm-Dialog → Abbrechen → Item bleibt in der Liste.
5. **Fehlerfall**: Wenn `unlinkTask` eine Exception wirft → Toast mit Fehlermeldung erscheint.
6. Analoges Testset für `OwnerTicketBoard`.

Bestehende Tests in `apps/web/src/components/ui/__tests__/` nicht brechen.

---

## Arbeitsreihenfolge

1. `apps/web/src/components/ui/OwnerRelationBoard.tsx` erstellen und exportieren
2. `apps/web/src/components/tasks/TaskLinkDialog.tsx` aus `OwnerTaskBoard` extrahieren
3. `OwnerTaskBoard.tsx` auf `OwnerRelationBoard` umschreiben
4. `apps/web/src/components/tickets/TicketLinkDialog.tsx` aus `OwnerTicketBoard` extrahieren
5. `OwnerTicketBoard.tsx` auf `OwnerRelationBoard` umschreiben
6. Alle Fundstellen via Grep prüfen — Imports und Props-APIs anpassen
7. TypeScript-Build prüfen (`tsc --noEmit`)
8. Visuelle Smoke-Tests in der App (Aufgaben-Board in Projektdetail, Ticket-Board in Projektdetail)

---

## Codebase-Zusammenfassung (aufgabenrelevant)

### `ListBoardView<T>` (`components/ui/ListBoardView.tsx`)
Generische List/Board-Surface mit Search, Filters, ViewToggle, `+`-Button (`onAdd`), optionalem `secondaryAction` Slot (für den Link-Button), `onAddToColumn` für Kanban-Spalten. Rendert Items via `renderCard`/`renderRow` Callbacks. **Nicht ändern.**

### `TaskListBoardView` (`components/tasks/TaskListBoardView.tsx`)
Domain-Adapter über `ListBoardView` für Tasks. Props: `tasks`, `viewMode`, `onAdd`, `onAddStatus`, `onOpen`, `onDelete`, `linkAction` (→ `secondaryAction`), `loading`. Enthält Status-Filter-Chips und Kanban-Status-Spalten (todo/in_progress/done). **Nicht ändern.**

### `TicketListBoardView` (`components/tickets/TicketListBoardView.tsx`)
Analoges Adapter-Pattern für Tickets mit 5 Status-Spalten. **Nicht ändern.**

### `OwnerTaskBoard` (`components/tasks/OwnerTaskBoard.tsx`)
Stateful Orchestrator: verbindet `useTasks(owner)`, `TaskListBoardView`, inline `TaskLinkDialog`, `TaskForm`, `TaskDetail`. Enthält `useViewMode()`, `useConfirm()`, `useToast()`. **Wird umgeschrieben.**

### `OwnerTicketBoard` (`components/tickets/OwnerTicketBoard.tsx`)
Identisches Muster für Tickets. Enthält inline `TicketLinkDialog`. **Wird umgeschrieben.**

### `useTasks(owner)` (`hooks/useTasks.ts`)
React-Query-Hook für alle Task-Operationen an einem `owner: { type: "project" | "feature" | "useCase", id: number }`. Exponiert: `tasks`, `loading`, `createTask`, `linkTask`, `unlinkTask`, `updateTask`, `updateTaskBoard`, `removeTask`, `reload`.

### `useTickets(owner?)` (`hooks/useTickets.ts`)
Analoges Pattern für Tickets mit `owner?: TicketOwner | null` (type: `"project" | "task" | "feature" | "useCase"`). Wichtiger Unterschied zu `useTasks`: Kann **ohne Owner** aufgerufen werden — dann wird die globale Ticket-Liste geladen (genutzt im `TicketLinkDialog` für den Such-Fetch über alle Tickets). Exponiert: `tickets`, `loading`, `createTicket`, `linkTicket`, `unlinkTicket`, `updateTicket`, `updateTicketPosition`, `removeTicket`, `reload`.

### Schema n:m-Tabellen
- Tasks: `projectTasks`, `featureTasks`, `useCaseTasks` (Felder: `ownerId`, `taskId`, `position`)
- Tickets: `projectTickets`, `taskTickets`, `featureTickets`, `useCaseTickets` (Felder: `ownerId`, `ticketId`, `position`)

### `RelationPanel<T>` (`components/ui/RelationPanel.tsx`)
Checkbox-basierter n:m-Manager (für Feature↔Projekt, UseCase↔Task etc.). **Nicht betroffen von diesem Auftrag.**

### `FeatureProjectPanel` (`components/features/FeatureProjectPanel.tsx`)
Nutzt `ListBoardView` direkt mit eigenem Add-Modal (FormModal). Items haben Trash-Icon (`Trash2`) über `renderCard`/`renderRow`-Closures. Kein `OwnerRelationBoard`-Kandidat. **Nicht ändern.**
