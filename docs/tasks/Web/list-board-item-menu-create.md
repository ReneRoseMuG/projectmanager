# Codex-Auftrag: List/Board Item Menüs — Create-Aktionen

## Aufgabenbeschreibung

Das Drei-Punkt-Menü (`ActionMenu`) auf Board Cards und List-Rows wird kontextabhängig um Create-Aktionen erweitert. Im Projekt-Kontext erscheinen drei neue Einträge (Neuer Meilenstein, Neue Aufgabe, Neues Ticket), im Meilenstein-Kontext zwei (Neue Aufgabe, Neues Ticket). Ein Klick öffnet das jeweilige Create-Formular als Modal mit vorgebelegtem Parent.

## Scope

| Datei | Änderung |
|---|---|
| `apps/web/src/components/ui/ItemCard.tsx` | `extraMenuItems?` Prop ergänzen |
| `apps/web/src/components/ui/PlanningItemCard.tsx` | `extraMenuItems?` Prop ergänzen + durchreichen |
| `apps/web/src/components/projects/ProjectCard.tsx` | Create-Props → `extraMenuItems` |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | Create-Props → `extraMenuItems` |
| `apps/web/src/components/projects/ProjectListBoardView.tsx` | Create-Props durchreichen |
| `apps/web/src/components/milestones/MilestoneListBoardView.tsx` | Create-Props durchreichen |
| `apps/web/src/pages/ProjectsPage.tsx` | Modal-State + Create-Callbacks |
| `apps/web/src/pages/MilestonesPage.tsx` | Modal-State + Create-Callbacks |

Keine Backend-Änderungen. Keine neuen Abhängigkeiten.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lese zunächst:

- `docs/architecture-leitfaden.md`
- `docs/design-richtlinien-visuell.md`
- Alle oben genannten Dateien vollständig

Erstelle eine Ist/Soll-Tabelle:

| Datei | Ist | Soll |
|---|---|---|
| `ItemCard.tsx` | Props: `onEdit?`, `onDelete?` | + `extraMenuItems?: ActionMenuItem[]` |
| `PlanningItemCard.tsx` | Props: `onEdit`, `onDelete` | + `extraMenuItems?: ActionMenuItem[]`, weitergegeben an Card und Row |
| `ProjectCard.tsx` | Props: `onEdit`, `onDelete` | + `onCreateMilestone?`, `onCreateTask?`, `onCreateTicket?` |
| `MilestoneCard.tsx` | Props: `onEdit`, `onDelete` | + `onCreateTask?`, `onCreateTicket?` |
| `ProjectListBoardView.tsx` | Keine Create-Props | + optionale Create-Callbacks |
| `MilestonesPage.tsx` | Kein Modal für Task/Ticket | + State + Callbacks für alle drei Forms |

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: `ItemCard` — `extraMenuItems` Prop

```tsx
interface ItemCardProps {
  // ... bestehende Props ...
  extraMenuItems?: ActionMenuItem[];
}

export function ItemCard({ ..., extraMenuItems = [] }: ItemCardProps) {
  // ...
  items={[
    ...(onEdit ? [{ label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: onEdit }] : []),
    ...extraMenuItems,
    ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: onDelete, danger: true }] : []),
  ]}
```

**Reihenfolge:** Bearbeiten → Create-Aktionen → Löschen. Löschen bleibt immer am Ende.

---

## Schritt 3: `PlanningItemCard` — `extraMenuItems` durchreichen

```tsx
interface PlanningItemCardProps {
  // ... bestehende Props ...
  extraMenuItems?: ActionMenuItem[];
}
```

**Card-Variante:** `extraMenuItems` an `ItemCard` weitergeben.

**Row-Variante:** `extraMenuItems` in die `ActionMenu`-`items`-Liste einbauen, gleiche Reihenfolge wie in Schritt 2 (zwischen Bearbeiten und Löschen).

---

## Schritt 4: `ProjectCard` — Create-Props

```tsx
interface ProjectCardProps {
  // ... bestehende Props ...
  onCreateMilestone?: () => void;
  onCreateTask?: () => void;
  onCreateTicket?: () => void;
}
```

Icons aus `lucide-react` (bereits importiert oder ergänzen):
- `Flag` für Neuer Meilenstein
- `ListTodo` für Neue Aufgabe
- `Bug` für Neues Ticket

```tsx
const createMenuItems: ActionMenuItem[] = [
  ...(onCreateMilestone ? [{ label: "Neuer Meilenstein", icon: <Flag size={16} />, onClick: onCreateMilestone }] : []),
  ...(onCreateTask ? [{ label: "Neue Aufgabe", icon: <ListTodo size={16} />, onClick: onCreateTask }] : []),
  ...(onCreateTicket ? [{ label: "Neues Ticket", icon: <Bug size={16} />, onClick: onCreateTicket }] : []),
];
```

Diese an `PlanningItemCard` als `extraMenuItems={createMenuItems}` übergeben.

---

## Schritt 5: `MilestoneCard` — Create-Props

Analog zu `ProjectCard`, aber nur `onCreateTask?` und `onCreateTicket?`:

```tsx
interface MilestoneCardProps {
  // ... bestehende Props ...
  onCreateTask?: () => void;
  onCreateTicket?: () => void;
}
```

---

## Schritt 6: `ProjectListBoardView` und `MilestoneListBoardView`

Beide erhalten optionale Create-Callback-Props und reichen sie an die jeweiligen Card-Komponenten weiter (in `renderCard` und `renderRow`). Alle neuen Props sind optional — bestehende Aufrufer ohne diese Props bleiben unverändert.

---

## Schritt 7: Page-Komponenten — Modal-State und Callbacks

### `ProjectsPage.tsx`

Für jede Create-Aktion aus dem Projekt-Kontext: State für das geöffnete Modal + den gewählten Projekt-Parent.

```tsx
const [createMilestoneForProject, setCreateMilestoneForProject] = useState<Project | null>(null);
const [createTaskForProject, setCreateTaskForProject] = useState<Project | null>(null);
const [createTicketForProject, setCreateTicketForProject] = useState<Project | null>(null);
```

Callbacks an `ProjectListBoardView` übergeben:

```tsx
onCreateMilestone={(project) => setCreateMilestoneForProject(project)}
onCreateTask={(project) => setCreateTaskForProject(project)}
onCreateTicket={(project) => setCreateTicketForProject(project)}
```

Modals am Ende der Page-Komponente:

```tsx
{/* Neuer Meilenstein aus Projekt */}
<MilestoneForm
  open={createMilestoneForProject !== null}
  initialProjectId={createMilestoneForProject?.id}
  projects={projects}
  closeOnSubmit
  onSubmit={async (input, tagIds) => { await createMilestone(input, tagIds); }}
  onClose={() => setCreateMilestoneForProject(null)}
/>

{/* Neue Aufgabe aus Projekt */}
<TaskForm
  open={createTaskForProject !== null}
  owner={createTaskForProject ? { type: "project", id: createTaskForProject.id } : undefined}
  closeOnSubmit
  onSubmit={async (input) => { await createTask(input); }}
  onClose={() => setCreateTaskForProject(null)}
/>

{/* Neues Ticket aus Projekt */}
<TicketForm
  open={createTicketForProject !== null}
  owner={createTicketForProject ? { type: "project", id: createTicketForProject.id } : undefined}
  closeOnSubmit
  onSubmit={async (input) => { await createTicket(input); }}
  onClose={() => setCreateTicketForProject(null)}
/>
```

Bestehende Import-Statements für `MilestoneForm`, `TaskForm`, `TicketForm` prüfen und ggf. ergänzen. Die `create*`-Mutations sind in der Page bereits vorhanden — nur die `owner`-Prop mit dem entsprechenden Projekt vorbelegen.

### `MilestonesPage.tsx`

Analog, mit `owner: { type: "milestone", id: milestone.id }` für Task und Ticket. Kein Meilenstein-Create aus Meilenstein-Kontext.

---

## Schritt 8: Callback-Signatur in List/Board Views

Da die Card-Komponenten nur `() => void` als Create-Callbacks kennen (sie kennen sich selbst), müssen die Callbacks in `renderCard` und `renderRow` per Closure das jeweilige Item einschließen:

```tsx
renderCard={(project) => (
  <ProjectCard
    project={project}
    onEdit={onEdit}
    onDelete={onDelete}
    onCreateMilestone={onCreateMilestone ? () => onCreateMilestone(project) : undefined}
    onCreateTask={onCreateTask ? () => onCreateTask(project) : undefined}
    onCreateTicket={onCreateTicket ? () => onCreateTicket(project) : undefined}
  />
)}
```

Die `ProjectListBoardViewProps`-Signaturen werden entsprechend:

```tsx
onCreateMilestone?: (project: Project) => void;
onCreateTask?: (project: Project) => void;
onCreateTicket?: (project: Project) => void;
```

---

## Tests

### Unit-Tests

- `ProjectCard` mit Create-Props: Menü zeigt drei neue Einträge
- `ProjectCard` ohne Create-Props: Menü unverändert (nur Bearbeiten + Löschen)
- `MilestoneCard` mit Create-Props: Menü zeigt zwei neue Einträge
- Row-Variante: gleiche Einträge wie Card-Variante
- Reihenfolge: Bearbeiten → Create-Aktionen → Löschen

### E2E-Tests

- Im Projekt-Board: Menü öffnen → „Neue Aufgabe" → Formular öffnet sich mit vorgebelegtem Projekt
- Nach Speichern: Modal schließt, Aufgabe erscheint in der Aufgabenliste des Projekts
- Abbrechen: Modal schließt, keine Aufgabe erstellt

---

## Akzeptanzkriterien

- [ ] Projekt-Menü zeigt: Neuer Meilenstein, Neue Aufgabe, Neues Ticket
- [ ] Meilenstein-Menü zeigt: Neue Aufgabe, Neues Ticket
- [ ] Jedes Formular öffnet sich als Modal mit korrekt vorgebelegtem Parent (nicht änderbar)
- [ ] Nach erfolgreichem Speichern: Modal schließt, Ansicht aktualisiert sich
- [ ] Bestehende Einträge Bearbeiten und Löschen bleiben unverändert
- [ ] Alle neuen Props sind optional — bestehende Aufrufer ohne Anpassung weiter funktionsfähig
- [ ] Alle Unit-Tests grün, keine bestehenden Tests gebrochen

---

## Referenz

- Design-Richtlinien: `docs/design-richtlinien-visuell.md`
- `ItemCard`: `apps/web/src/components/ui/ItemCard.tsx`
- `PlanningItemCard`: `apps/web/src/components/ui/PlanningItemCard.tsx`
- `ActionMenu`: `apps/web/src/components/ui/ActionMenu.tsx`
- `FormModal`: `apps/web/src/components/ui/FormModal.tsx`
- `MilestoneForm`: `apps/web/src/components/milestones/MilestoneForm.tsx`
- `TaskForm`: `apps/web/src/components/tasks/TaskForm.tsx`
- `TicketForm`: `apps/web/src/components/tickets/TicketForm.tsx`
