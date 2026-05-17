# Codex-Auftrag: Board/ListView Test Suite

## Ziel

Für jedes Domänenobjekt, das über `ListBoardView` als Board- oder Listenansicht dargestellt wird
(`Project`, `Task`, `Feature`, `BacklogItem`, `UseCase`), eine dedizierte Testdatei anlegen.
Jede Datei baut echte, vollständig befüllte Testdaten auf und weist nach:

1. **Board-View**: Layout-Struktur, Spaltenzuordnung der Karten, korrekte Dimensionsklassen,
   alle erwarteten Controls pro Karte vorhanden.
2. **List-View**: Layout-Struktur, korrekte Dimensionsklassen pro Zeile, alle erwarteten Controls vorhanden.

---

## Kontext

### Generische Infrastruktur

| Datei | Rolle |
|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | Generische Board/List-Oberfläche mit Toolbar (SearchInput, ViewToggle, Add-Button) |
| `apps/web/src/components/ui/ItemCard.tsx` | Karten-Primitiv: `article.rounded-2xl.border.border-line.bg-white.p-5.shadow-sm` — mit optionalem Accent-Streifen oben, Edit- und Löschen-Button |
| `apps/web/src/components/ui/ItemRow.tsx` | Zeilen-Primitiv: `article.grid-cols-[auto_minmax(0,1fr)_auto_auto_auto].rounded-xl.border.border-l-[4px].border-line.bg-white.px-4.py-3.5` |
| `apps/web/src/components/ui/CardGrid.tsx` | Statusloses Board-Raster: `grid gap-4 md:grid-cols-2 xl:grid-cols-3` |

### Board-Modus mit Status-Spalten (nur Project, Task, Feature)

Diese drei Wrapper übergeben `statusKey` und `statusColumns` an `ListBoardView`.
Das Board rendert ein `div.grid.gap-4.lg:grid-cols-3`.
Jede Spalte ist ein `section` mit Klassen `grid min-h-[240px] content-start gap-3 rounded-lg border border-line bg-shell/60 p-3`.
Der Spalten-Header enthält ein `h2` mit dem Spaltenlabel und ein `span` mit der Item-Anzahl.
Wenn `onAddToColumn` übergeben wurde, gibt es pro Spalte einen Add-Button mit
`aria-label="<ColumnLabel> hinzufügen"`.

### Board-Modus ohne Status-Spalten — CardGrid (BacklogItem, UseCase)

`BacklogListBoardView` und `UseCaseListBoardView` übergeben **kein** `statusKey`.
Im Board-Modus rendert `ListBoardView` deshalb `CardGrid`:
`div.grid.gap-4.md:grid-cols-2.xl:grid-cols-3` — **keine** `section`-Spalten, kein `lg:grid-cols-3`.

### Domänenobjekte und ihre Board-Struktur

| Objekt | Wrapper-Komponente | Board-Struktur | Statuswerte |
|---|---|---|---|
| `Project` | `ProjectListBoardView` | Status-Spalten (`lg:grid-cols-3`) | `active`, `on_hold`, `completed`, `archived` |
| `Task` | `TaskListBoardView` | Status-Spalten (`lg:grid-cols-3`) | `todo`, `in_progress`, `done` |
| `Feature` | `FeatureListBoardView` | Status-Spalten (`lg:grid-cols-3`) | `draft`, `active`, `done`, `archived` |
| `BacklogItem` | `BacklogListBoardView` | `CardGrid` (kein `statusKey`) | — |
| `UseCase` | `UseCaseListBoardView` | `CardGrid` (kein `statusKey`) | — |

### Listenmodus-Rendering pro Domänenobjekt

`FeatureCard` besitzt **kein** `variant="row"`. Im Listenmodus rendert `FeatureListBoardView`
erneut `ItemCard` (nicht `ItemRow`). Die List-Assertions für Feature prüfen daher
`article.rounded-2xl`-Karten, nicht `article.rounded-xl`-Rows.

| Objekt | List-Rendering | Artikel-Klasse |
|---|---|---|
| `Project` | `ItemRow` (via `ProjectCard variant="row"`) | `article.rounded-xl` |
| `Task` | `ItemRow` (via `TaskCard variant="row"`) | `article.rounded-xl` |
| `Feature` | `ItemCard` (FeatureCard hat kein `variant="row"`) | `article.rounded-2xl` |
| `BacklogItem` | `ItemRow` (inline `BacklogItemRow`) | `article.rounded-xl` |
| `UseCase` | `ItemRow` (via `UseCaseCard variant="row"`) | `article.rounded-xl` |

### Karten-Controls pro Domänenobjekt

| Objekt | Board-Card Controls | List Controls |
|---|---|---|
| `Project` | Edit (`aria-label="Bearbeiten"`), Delete (`aria-label="Löschen"`), Doppelklick öffnet Route | Edit, Delete, Doppelklick öffnet Route |
| `Task` | Edit (`aria-label="Bearbeiten"`), Delete (`aria-label="Löschen"`), Doppelklick öffnet | Edit (`aria-label="Öffnen"`), Delete (`aria-label="Löschen"`) |
| `Feature` | Edit (`aria-label="Bearbeiten"`), Delete (`aria-label="Löschen"`), Doppelklick öffnet | Edit (`aria-label="Bearbeiten"`), Delete (`aria-label="Löschen"`) — selbe ItemCard |
| `BacklogItem` | Edit (`aria-label="Bearbeiten"`), Delete (`aria-label="Löschen"`) | Edit (`aria-label="Bearbeiten"`), Delete (`aria-label="Löschen"`) |
| `UseCase` | Doppelklick öffnet (kein Edit/Delete-Button) | Doppelklick öffnet (kein Edit/Delete-Button) |

---

## Aufgabe

### Schritt 0 — Analyse vor der Umsetzung

Auftrag klassifizieren als **Klasse 5 (mehrschichtige Änderung)**. Vor der Implementierung folgende
Dateien gezielt lesen (nur was noch nicht bekannt ist):

- `apps/web/src/components/features/FeatureCard.tsx` — prüfen ob `variant="row"` existiert
- `apps/web/src/components/projects/ProjectCard.tsx` — vollständiger Footer und `min-h-60` bestätigen
- `apps/web/vite.config.ts` — Vitest-Konfiguration bestätigen (jsdom, globals, setupFiles)
- Alle fünf `*ListBoardView`-Dateien — Spalten-Definitionen und Props vollständig lesen

Ziel: sicherstellen, dass die Factories exakt die Interface-Felder aus `packages/shared-types/src/index.ts`
bedienen und keine Felder fehlen.

### Schritt 1 — Factory-Datei anlegen

**Datei:** `apps/web/src/components/ui/__tests__/factories.ts`

Exportiert eine Factory-Funktion für jedes Domänenobjekt. Alle Felder sind mit realistischen
Werten belegt — keine leeren Strings, keine Null-Werte außer wo fachlich notwendig.
Relationen (Tags, Subtasks-Count usw.) sind vollständig gefüllt.

```ts
// Beispiel-Signaturen — vollständige Implementierung ist Aufgabe von Codex

import type {
  BacklogItem, Feature, Project, Tag, Task, UseCase
} from "@taskmanager/shared-types";

export function buildTag(overrides?: Partial<Tag>): Tag
export function buildProject(overrides?: Partial<Project>): Project
export function buildTask(overrides?: Partial<Task>): Task
export function buildFeature(overrides?: Partial<Feature>): Feature
export function buildUseCase(overrides?: Partial<UseCase>): UseCase
export function buildBacklogItem(overrides?: Partial<BacklogItem>): BacklogItem
```

**Anforderungen an die Defaults:**

- `buildProject`: `status: "active"`, `color: "#4f46e5"`, `openTaskCount: 3`,
  `doneTaskCount: 2`, `totalTaskCount: 5`, `tags: [buildTag()]`
- `buildTask`: `status: "todo"`, `priority: "high"`, `assignee: "Max Mustermann"`,
  `dueDate: "2026-12-31"`, `subtaskCount: 2`, `tags: [buildTag()]`
- `buildFeature`: `status: "active"`, `slug: "feature-login"`, `useCaseCount: 3`,
  `description: "Ermöglicht die Benutzeranmeldung"`, `sortOrder: 1`
- `buildUseCase`: `status: "active"`, `slug: "uc-login-success"`, `sortOrder: 1`,
  `featureId: 1`, `description: "Normaler Anmeldeablauf"`
- `buildBacklogItem`: `status: "open"`, `priority: "medium"`, `featureId: 1`,
  `description: "Passwort-Reset implementieren"`, `sortOrder: 1`

Für Objekte mit mehreren Status-Werten je eine Variante pro Status anlegen:

```ts
export function buildProjectSet(): Project[]  // je ein Projekt pro Status
export function buildTaskSet(): Task[]         // je eine Task pro Status
export function buildFeatureSet(): Feature[]   // je ein Feature pro Status
```

### Schritt 2 — Testdateien anlegen (eine pro Domänenobjekt)

Ablagepfad: `apps/web/src/components/ui/__tests__/`

| Dateiname | Getestete Komponente |
|---|---|
| `ProjectListBoardView.test.tsx` | `ProjectListBoardView` |
| `TaskListBoardView.test.tsx` | `TaskListBoardView` |
| `FeatureListBoardView.test.tsx` | `FeatureListBoardView` |
| `BacklogListBoardView.test.tsx` | `BacklogListBoardView` |
| `UseCaseListBoardView.test.tsx` | `UseCaseListBoardView` |

Jede Datei beginnt mit dem Pflicht-Kommentar aus `agents.md` § 11.

#### Router-Stub

`ProjectCard`, `FeatureCard` und `UseCaseCard` rufen intern `useNavigate` aus `react-router-dom` auf.
Alle Tests wrappen die gerenderte Komponente in einen `MemoryRouter` aus `react-router-dom`.

```tsx
import { MemoryRouter } from "react-router-dom";
// Verwendung:
render(<MemoryRouter><ProjectListBoardView .../></MemoryRouter>)
```

#### Pflicht-Assertions für den Board-View — mit Status-Spalten (Project, Task, Feature)

**Layout & Struktur:**

```ts
// Board-Container mit Statusspalten ist im DOM
const board = container.querySelector(".lg\\:grid-cols-3");
expect(board).toBeInTheDocument();

// Jede Spalte hat Mindesthöhe und korrekte Formgebung
const columns = container.querySelectorAll("section.rounded-lg");
expect(columns.length).toBe(<erwartete Spaltenanzahl>);  // 4 für Project/Feature, 3 für Task

// Jede Spalte enthält mindestens das h2 mit dem Spaltenlabel
statusColumns.forEach(col => {
  expect(screen.getByText(col.label)).toBeInTheDocument();
});
```

**Spaltenzuordnung (gilt für Project, Task, Feature):**

```ts
// buildProjectSet() liefert je ein Objekt pro Status
// Erwartung: jede Karte landet in der richtigen Spalte
const activeCol = screen.getByText("Aktiv").closest("section");
expect(activeCol).toContainElement(screen.getByText("Projekt Aktiv"));

const archivedCol = screen.getByText("Archiviert").closest("section");
expect(archivedCol).toContainElement(screen.getByText("Projekt Archiviert"));
```

**Karten-Dimensionsklassen (ItemCard):**

```ts
const cards = container.querySelectorAll("article.rounded-2xl");
expect(cards.length).toBeGreaterThan(0);
cards.forEach(card => {
  expect(card).toHaveClass("border");
  expect(card).toHaveClass("bg-white");
  expect(card).toHaveClass("p-5");
  expect(card).toHaveClass("shadow-sm");
});
```

**Accent-Streifen (ItemCard):**

```ts
// Jede Karte mit accentColor hat einen absolut positionierten Streifen oben
cards.forEach(card => {
  const accent = card.querySelector("span.absolute.inset-x-0.top-0.h-1");
  expect(accent).toBeInTheDocument();
});
```

**Controls (domänenspezifisch, im Board-Modus):**

Für Project und Task (haben Edit + Delete):

```ts
const editButtons = screen.getAllByRole("button", { name: "Bearbeiten" });
expect(editButtons.length).toBe(<anzahl items>);

const deleteButtons = screen.getAllByRole("button", { name: "Löschen" });
expect(deleteButtons.length).toBe(<anzahl items>);
```

Für UseCase (nur Doppelklick, kein expliziter Edit/Delete-Button):

```ts
expect(screen.queryByRole("button", { name: "Bearbeiten" })).not.toBeInTheDocument();
```

**Spalten-Add-Button (wo `onAddToColumn` übergeben):**

```ts
// Für Project: vier Spalten, vier Add-Buttons
const addButtons = screen.getAllByRole("button", { name: /hinzufügen/ });
expect(addButtons.length).toBe(4);

// Klick auf Spalten-Button ruft onAddToColumn mit korrektem Status
fireEvent.click(screen.getByRole("button", { name: "Aktiv hinzufügen" }));
expect(onAddToColumn).toHaveBeenCalledWith("active");
```

**Item-Zähler in Spalten-Header:**

```ts
// Spalte mit zwei Items zeigt "2" im Counter-Badge
const activeHeader = screen.getByText("Aktiv").closest("header");
expect(activeHeader).toHaveTextContent("1"); // buildProjectSet liefert je 1 pro Status
```

#### Pflicht-Assertions für den Board-View — CardGrid (BacklogItem, UseCase)

```ts
// Kein lg:grid-cols-3 (keine Statusspalten)
expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();
// Kein section.rounded-lg (keine Spalten-Sections)
expect(container.querySelector("section.rounded-lg")).not.toBeInTheDocument();

// CardGrid ist vorhanden: div mit gap-4
const grid = container.querySelector(".gap-4");
expect(grid).toBeInTheDocument();

// Karten sind ItemCard
const cards = container.querySelectorAll("article.rounded-2xl");
expect(cards.length).toBe(items.length);
```

#### Pflicht-Assertions für den List-View — ItemRow (Project, Task, BacklogItem, UseCase)

```ts
// Kein Board-Container
expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();

// Rows vorhanden (ItemRow rendert article.rounded-xl)
const rows = container.querySelectorAll("article.rounded-xl");
expect(rows.length).toBe(<erwartete anzahl>);
```

**Zeilen-Dimensionsklassen (ItemRow):**

```ts
rows.forEach(row => {
  expect(row).toHaveClass("border-l-[4px]");
  expect(row).toHaveClass("bg-white");
  expect(row).toHaveClass("px-4");
  expect(row).toHaveClass("py-3.5");
  expect(row).toHaveClass("shadow-sm");
});
```

**Accent-Farbe als Inline-Style (ItemRow):**

```ts
rows.forEach(row => {
  // borderLeftColor ist als Inline-Style gesetzt, nicht als CSS-Klasse
  expect(row).toHaveStyle({ borderLeftColor: expect.any(String) });
});
```

**Titel ist lesbar:**

```ts
items.forEach(item => {
  expect(screen.getByText(item.title)).toBeInTheDocument();
});
```

**Controls in der Row (domänenspezifisch):**

Für BacklogItem:

```ts
const editButtons = screen.getAllByRole("button", { name: "Bearbeiten" });
expect(editButtons.length).toBe(items.length);
const deleteButtons = screen.getAllByRole("button", { name: "Löschen" });
expect(deleteButtons.length).toBe(items.length);
```

#### Pflicht-Assertions für den List-View — weiterhin ItemCard (Feature)

`FeatureCard` hat kein `variant="row"`. Im Listenmodus rendert `FeatureListBoardView` dieselbe
`ItemCard` wie im Board-Modus, nur ohne Spalten-Umhüllung.

```ts
// Kein lg:grid-cols-3 (keine Statusspalten)
expect(container.querySelector(".lg\\:grid-cols-3")).not.toBeInTheDocument();

// Karten sind weiterhin article.rounded-2xl (ItemCard), keine ItemRow
const cards = container.querySelectorAll("article.rounded-2xl");
expect(cards.length).toBe(features.length);

// Kein article.rounded-xl (kein ItemRow)
expect(container.querySelector("article.rounded-xl")).not.toBeInTheDocument();
```

#### Pflicht-Assertions für die Toolbar (gilt für alle fünf)

```ts
// SearchInput vorhanden
expect(screen.getByPlaceholderText("Suchen")).toBeInTheDocument();

// ViewToggle: "Kanban"- und "Liste"-Button (nicht "Board"!)
// ViewToggle rendert die Labels aus dem ViewMode-Typ: "kanban" → "Kanban", "list" → "Liste"
expect(screen.getByRole("button", { name: "Kanban" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();

// Globaler Add-Button vorhanden (addLabel ist domänenspezifisch)
expect(screen.getByRole("button", { name: /Neue[rs]?/ })).toBeInTheDocument();
```

#### Moduswechsel-Test (gilt für alle fünf)

```ts
it("wechselt von Board- in Listen-Modus", () => {
  // Board-Modus: Karten sichtbar
  // Click auf "Liste"-Button → onModeChange / onViewModeChange aufgerufen
  // List-Modus: Rows sichtbar (oder weiterhin Karten bei Feature)
});
```

#### Leer-Zustand

```ts
it("zeigt EmptyState wenn keine Items vorhanden", () => {
  // items=[] → EmptyState-Komponente sichtbar, keine cards/rows
});
```

### Schritt 3 — Vitest-Konfiguration und Test-Script sicherstellen

**Vitest-Config:** `apps/web/vite.config.ts` prüfen ob folgende Optionen vorhanden sind:

```ts
test: {
  environment: "jsdom",
  globals: true,
  setupFiles: ["..."] // Datei, die "@testing-library/jest-dom/vitest" importiert
}
```

Falls `setupFiles` noch nicht konfiguriert ist, Setup-Datei anlegen und eintragen.
Kein Umbau der bestehenden Konfiguration — nur ergänzen was fehlt.

**Test-Script:** `apps/web/package.json` enthält aktuell kein `test`-Script. Folgende Zeile
im `"scripts"`-Block ergänzen:

```json
"test": "vitest run"
```

Damit ist `npm run test -w apps/web` aus dem Repo-Root ausführbar.

### Schritt 4 — Testlauf

Nach der Implementierung aller fünf Testdateien und dem Script-Eintrag:

```bash
npm run test -w apps/web
```

Ergebnis dokumentieren. Schlägt ein Test fehl, wird der Fehler im Log festgehalten —
eigenständige Fixes sind unzulässig.

---

## Regeln & Einschränkungen

- **Keine Produktionscode-Änderungen.** Wenn ein Test nur durch eine Änderung an einer
  Produktionskomponente bestehen kann (z. B. fehlende `aria-label`), wird das als Blocker
  dokumentiert, nicht still gefixt.
- Alle fünf Dateien verwenden `// @vitest-environment jsdom` als ersten Kommentar **oder**
  verlassen sich auf die globale Konfiguration — nicht mischen.
- Der `MemoryRouter`-Wrapper ist Pflicht für alle Komponenten, die intern `useNavigate` aufrufen
  (`ProjectListBoardView`, `FeatureListBoardView`, `UseCaseListBoardView`). Fehlt er, schlägt
  der Test mit einem React-Router-Fehler fehl.
- `vi.fn()` für alle Callbacks (`onCreate`, `onEdit`, `onDelete`, `onOpen`, `onAddToColumn`,
  `onViewModeChange`).
- Keine `test.skip`, keine leeren Testbodies. Jeder Test hat mindestens eine fachliche Assertion.
- Auftragsklasse: **Klasse 5** — voller Plan vor Umsetzung, Schritt-Log nach Abschluss.

---

## Randfälle & Fehlerpfade

- **BacklogItem ohne Feature-Zuordnung**: ein Item mit `featureId: null` testen →
  im Board/List erscheint das Badge „Ohne Feature" (Badge tone="mute").
- **Task ohne Tags**: ein Task mit `tags: []` → kein Tag-Bereich im Footer.
- **Task mit überfälligem Datum**: `dueDate` in der Vergangenheit, `status !== "done"` →
  Datum wird in `text-crimson` gerendert.
- **ItemCard ohne onEdit/onDelete**: kein Button-Container gerendert
  (kein `div.z-20` mit Buttons).
- **BacklogItem mit `status: "rejected"`**: Karte hat `opacity-65`, Titel ist durchgestrichen
  (`line-through`).

---

## Seiteneffekte

Keine Produktionsdateien werden verändert. Die einzige neue Nicht-Test-Datei ist ggf. ein
Vitest-Setup-File falls es noch nicht existiert.

---

## Testhinweise

Die bestehende Datei `apps/web/src/components/ui/__tests__/ListBoardView.test.tsx` ist das
Referenzmuster für Testaufbau, Imports und Kommentarstruktur. Neue Tests folgen exakt diesem Muster.

Relevante existierende Tests als Orientierung:

- `ListBoardView.test.tsx` — Basis-Infrastruktur (bereits implementiert, nicht duplizieren)
- `atoms.test.tsx` — Atomic-UI-Komponenten

Neue Tests bauen auf der Infrastruktur auf und testen ausschließlich das domänenspezifische
Verhalten der Wrapper-Komponenten.

---

## Feature-Zusammenfassung: Betroffene Komponenten

### `ListBoardView` (generisch)

- Props: `items`, `mode` ("list"|"board"), `onModeChange`, `onAdd`, `onAddToColumn?`,
  `addLabel`, `statusKey?`, `statusColumns?`, `renderCard`, `renderRow`,
  `searchValue`, `onSearchChange`, `filters?`, `emptyState?`, `loading?`
- Board mit `statusKey`: rendert `div.grid.gap-4.lg:grid-cols-3`, je Column ein `section`
- Board ohne `statusKey`: rendert `CardGrid` (responsive, 3-spaltig ab xl)
- List: rendert `div.grid.gap-3` mit `renderRow` pro Item

### `ItemCard`

- `article.rounded-2xl.border.border-line.bg-white.p-5.shadow-sm`
- Optionaler Accent-Streifen: `span.absolute.inset-x-0.top-0.h-1` mit `backgroundColor` inline
- Edit-Button: `aria-label="Bearbeiten"`, `h-8 w-8`
- Delete-Button: `aria-label="Löschen"`, `h-8 w-8`
- `onDoubleClick` → `onOpen`

### `ItemRow`

- `article.grid-cols-[auto_minmax(0,1fr)_auto_auto_auto].items-center.gap-4.rounded-xl`
- `.border.border-l-[4px].border-line.bg-white.px-4.py-3.5.shadow-sm`
- Accent-Farbe als `style={{ borderLeftColor }}` inline
- 5 Slots: statusIndicator | title+description | pills | meta | actions

### Statuswerte (für Spalten-Definitionen in Tests)

```ts
// Project
{ value: "active", label: "Aktiv" }
{ value: "on_hold", label: "Pausiert" }
{ value: "completed", label: "Abgeschlossen" }
{ value: "archived", label: "Archiviert" }

// Task
{ value: "todo", label: "Offen" }
{ value: "in_progress", label: "In Arbeit" }
{ value: "done", label: "Erledigt" }

// Feature
{ value: "draft", label: "Entwurf" }
{ value: "active", label: "Aktiv" }
{ value: "done", label: "Erledigt" }
{ value: "archived", label: "Archiviert" }
```
