# Codex-Auftrag: Drag & Drop im Board-Modus (Status-Spalten)

## Ziel

Im Board-Modus (`ListBoardView`, mode = `"board"`) können Karten per Drag & Drop
zwischen Status-Spalten verschoben werden. Das Loslassen einer Karte in einer anderen
Spalte aktualisiert den Status der Entität sofort (optimistisch) und persistiert die
Änderung per API-Mutation. Der Listen-Modus bleibt unberührt.

Mindestumfang: Aufgaben (Tasks). Die Implementierung erfolgt so, dass alle anderen
Domain-Views (Tickets, Features, BacklogItems usw.) später mit wenig Aufwand
nachgerüstet werden können.

---

## Kontext

### Betroffene Dateien

| Datei | Rolle |
|---|---|
| `apps/web/src/components/ui/ListBoardView.tsx` | Generische Board/List-Oberfläche — enthält das Board-Rendering mit Status-Spalten |
| `apps/web/src/components/ui/ItemCard.tsx` | Basis-Karte — wird in allen Board-Karten verwendet |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | Task-Adapter über `ListBoardView` |
| `apps/web/src/components/tasks/OwnerTaskBoard.tsx` | Orchestriert Tasks eines Owners, ruft `TaskListBoardView` auf |
| `apps/web/src/hooks/useTasks.ts` | TanStack-Query-Hook für Task-Mutationen |
| `apps/web/src/api/tasks.ts` | `ky`-Fetch-Funktionen für Task-API |

### Ist-Zustand

`ListBoardView` rendert im Board-Modus Spalten als einfache CSS-Grid-Container
(`grid-flow-col auto-cols-...`). Karten sind statische `<div>`-Elemente ohne
Drag-Fähigkeit. Es gibt keine `onItemStatusChange`-Callback-Prop.

Der Callback-Pfad für eine Statusänderung existiert noch nicht:
`ListBoardView` → `TaskListBoardView` → `OwnerTaskBoard` → `useTasks` → API.

---

## Aufgabe

### 1. DnD-Bibliothek installieren

`@dnd-kit/core` und `@dnd-kit/sortable` installieren (im `apps/web`-Workspace).
Diese Bibliothek ist React-18-kompatibel, zugänglich (ARIA-konform), hat keine
Peer-Dependency-Konflikte und ist aktiv gepflegt.

Kein HTML5-Drag-API-Eigenausbau — `@dnd-kit` abstrahiert Pointer-, Touch- und
Tastatur-Events.

### 2. `ListBoardView` — neues optionales Prop `onItemStatusChange`

```ts
onItemStatusChange?: (item: T, newStatus: string) => void | Promise<void>
```

Dieses Prop wird nur ausgewertet, wenn `mode === "board"` **und** `statusKey`
und `statusColumns` gesetzt sind.

Wenn `onItemStatusChange` vorhanden ist, wird das Board-Rendering in einen
`DndContext` (aus `@dnd-kit/core`) eingebettet. Die `onDragEnd`-Handler-Logik
prüft:

- War die Ziel-Spalte eine andere als die Quell-Spalte? Wenn nein: noop.
- Ist die Ziel-Spalte eine bekannte Spalte (`statusColumns`)? Wenn nein: noop.
- Sonst: `onItemStatusChange(item, newColumnValue)` aufrufen.

Wenn `onItemStatusChange` fehlt, ändert sich das Board-Rendering gegenüber dem
Ist-Zustand **nicht** — kein Breaking Change für bestehende Domain-Views.

### 3. Board-Spalten als Drop-Zonen (`useDroppable`)

Jede Status-Spalte im Board erhält eine `useDroppable`-Instanz mit der Spalten-ID
als `id`. Der visuelle Drop-Indikator (leichter Hintergrundton) wird über den
`isOver`-State der Droppable-Instanz gesteuert — ein Tailwind-Klassen-Swap reicht
aus, kein eigenes CSS.

### 4. Karten als Draggables (`useDraggable`)

Die Karten-Wrapper-Divs innerhalb der Spalten werden mit `useDraggable` ausgestattet.
Die `id` des Draggable-Elements ist die Item-ID (erwartet: `item.id` — Codex prüft
beim Lesen, wie die generische Typisierung gelöst wird; ein `idKey?: keyof T`-Prop
mit Default `"id"` ist eine saubere Option).

`ItemCard` selbst bleibt unverändert. Der `useDraggable`-Wrapper liegt
**ausschließlich** in `ListBoardView` im Board-Rendering-Zweig, nicht in `ItemCard`.

Der `DragOverlay` (aus `@dnd-kit/core`) zeigt während des Ziehens eine Kopie der
Karte an. Das verhindert Layout-Shifts in der Quell-Spalte. Die Kopie wird über
`renderCard(activeItem)` erzeugt, wobei `activeItem` der im `onDragStart` gemerkten
Item-Referenz entspricht.

### 5. Optimistisches Update

`onItemStatusChange` in `TaskListBoardView` wird als async-Funktion übergeben, die:

1. Die TanStack-Query-Mutation für den Status-Update aufruft.
2. TanStack Query übernimmt das optimistische Update — kein manuelles Setzen von
   lokalem State in `ListBoardView`.

Das bedeutet: `ListBoardView` ist statuslos bezüglich der Drag-Aktion. Es reicht,
den Callback aufzurufen und auf Cache-Invalidierung zu vertrauen.

### 6. Callback-Kette aufbauen

#### `useTasks` — neue Mutation `updateTaskStatus`

Falls noch nicht vorhanden: eine Mutation für `PATCH /api/tasks/:id/status`
(oder den existierenden Update-Endpunkt mit `{ status, expectedVersion }`) ergänzen.
Codex prüft zuerst, ob der bestehende `updateTask`-Mutationspfad wiederverwendet
werden kann, bevor eine neue Mutation angelegt wird.

Invalidierung: `invalidateTaskScope` (oder äquivalente Funktion aus
`src/queries/invalidation.ts`) nach erfolgreichem Update aufrufen.

#### `OwnerTaskBoard` → `TaskListBoardView`

`OwnerTaskBoard` übergibt eine `onStatusChange`-Prop an `TaskListBoardView`:

```tsx
onStatusChange={async (task, newStatus) => {
  await taskController.updateTaskStatus(task.id, newStatus, task.version);
}}
```

#### `TaskListBoardView` → `ListBoardView`

`TaskListBoardView` leitet `onStatusChange` als `onItemStatusChange` an
`ListBoardView` weiter.

---

## Regeln & Einschränkungen

- DnD nur im **Board-Modus** — im Listen-Modus kein DnD, keine `useDraggable`-Initialisierung.
- DnD nur zwischen bekannten Status-Spalten — Drop auf unbekannte Spalten wird still verworfen.
- Drop auf die **eigene** Spalte: noop, keine Mutation, kein Fehler.
- `ItemCard`, `ItemRow`, `TaskCard` und alle anderen Karten-Komponenten bleiben
  **unverändert** — der Draggable-Wrapper liegt ausschließlich in `ListBoardView`.
- Kein eigener lokaler State für Drag-Zwischenzustände in `ListBoardView` außer
  dem aktiven Item für den `DragOverlay` — alles andere über TanStack Query.
- `@dnd-kit`-Imports nur in `ListBoardView` — keine DnD-Imports in Domain-Adaptern
  oder Karten-Komponenten.
- Kein Sorting innerhalb einer Spalte im ersten Schritt. `@dnd-kit/sortable` kann
  installiert sein, muss aber nicht im ersten Auftrag genutzt werden. Sortierung
  innerhalb einer Spalte ist ein separater Folgeauftrag.
- Tastatur-Navigation: `@dnd-kit` liefert Keyboard-Sensor out of the box —
  aktivieren, aber kein eigenes Custom-Sensor-Schreiben nötig.
- `agents.md` Abschnitt 4.2 gilt: keine Refactorings außerhalb des beschriebenen Scopes.

---

## Randfälle & Fehlerpfade

| Fall | Erwartetes Verhalten |
|---|---|
| Drop auf eigene Spalte | noop — keine Mutation, kein visueller Effekt |
| Drop außerhalb einer Spalte (fehlgeschlagener Drop) | noop — Karte kehrt an Ursprungsposition zurück (`DragOverlay` verschwindet) |
| Drop auf unbekannte Spalte | noop |
| Mutation schlägt fehl (Netzwerkfehler, Versionskonfikt 409) | TanStack Query rollt das optimistische Update zurück; Toast-Fehlermeldung über `useToast` |
| Board lädt noch (loading = true) | DnD deaktiviert — kein `DndContext` rendern, solange `loading` true ist |
| `onItemStatusChange` fehlt | Board rendert wie bisher ohne jegliche DnD-Infrastruktur |
| Gleichzeitiges Öffnen mehrerer Tabs | Versionskonfikt 409 → Rollback + Toast |

---

## Seiteneffekte

- `ListBoardView` bekommt einen neuen optionalen Prop — alle bestehenden Aufrufer
  sind kompatibel, da das Prop optional ist.
- `TaskListBoardView` bekommt einen neuen optionalen Prop `onStatusChange` — ebenfalls
  optional, bestehende Aufrufer bleiben kompatibel.
- `OwnerTaskBoard` übergibt `onStatusChange` — kein Einfluss auf andere Komponenten.
- `useTasks` bekommt eine neue Mutation — kein Einfluss auf bestehende Mutations.
- Das Board-DOM ändert sich strukturell: Spalten-Wrapper und Karten-Wrapper erhalten
  neue Attribute (`data-dnd-droppable`, ARIA-Attribute von `@dnd-kit`). Bestehende
  Tests, die auf spezifische DOM-Strukturen prüfen, könnten Selektoren anpassen müssen.
- Kein API-Schema-Change, keine DB-Migration — die Statusänderung nutzt den
  bestehenden Task-Update-Endpunkt.

---

## Testhinweise

Framework: Vitest + @testing-library/react (Unit), Playwright (Browser/E2E).

### Unit-Tests

**Datei:** `tests/unit/web/components/ui/ListBoardView.dnd.test.tsx`

Pflicht-Kommentar:
```ts
/**
 * Test Scope: ListBoardView — Drag & Drop zwischen Status-Spalten
 *
 * Abgedeckte Regeln:
 * - DnD nur aktiv wenn onItemStatusChange übergeben wird
 * - Drop auf eigene Spalte: kein Callback
 * - Drop auf bekannte fremde Spalte: Callback mit item und newStatus
 * - Drop auf unbekannte Spalte: kein Callback
 *
 * Fehlerfälle:
 * - Abgebrochener Drag: kein Callback
 *
 * Ziel: Sicherstellen, dass die Callback-Logik in onDragEnd korrekt brancht
 */
```

Testfälle (nummeriert):

1. Board ohne `onItemStatusChange` → kein `DndContext` im DOM (Snapshot oder
   Abwesenheit des Attributs prüfen)
2. Board mit `onItemStatusChange` → `DndContext` vorhanden
3. Drag einer Karte auf andere Spalte → `onItemStatusChange` einmal mit korrektem
   item und `newStatus` aufgerufen
4. Drag einer Karte auf eigene Spalte → `onItemStatusChange` **nicht** aufgerufen
5. Drag einer Karte auf unbekannte Spalte → `onItemStatusChange` **nicht** aufgerufen
6. Abgebrochener Drag (kein `over` im `onDragEnd`) → `onItemStatusChange` **nicht** aufgerufen

Hinweis: `@dnd-kit` stellt `MockedDndContext` nicht offiziell bereit — der
`onDragEnd`-Handler kann direkt über die `DndContext`-`onDragEnd`-Prop getriggert
werden, indem das Event-Objekt manuell gebaut wird. Alternativ kann der Handler
als pure Funktion extrahiert und isoliert getestet werden.

**Datei:** `tests/unit/web/components/tasks/TaskListBoardView.dnd.test.tsx`

Testfälle:

1. `onStatusChange`-Prop vorhanden → wird als `onItemStatusChange` an `ListBoardView`
   weitergeleitet (Prop-Durchleitung prüfen)
2. `onStatusChange` nicht übergeben → `onItemStatusChange` nicht gesetzt

### Bestehende Tests

Folgende Test-Dateien können durch DOM-Strukturänderungen von `@dnd-kit` betroffen
sein. Codex prüft nach der Implementierung, welche konkreten Selektoren gebrochen sind:

| Testdatei | Mögliche Ursache |
|---|---|
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | Neue ARIA-Attribute, Wrapper-Divs im Board-Zweig |
| `tests/unit/web/components/tasks/TaskListBoardView.test.tsx` | Neues Prop in Adapter |

Anpassungen beschränken sich auf Selektor-Updates — keine neue Testlogik.

### Browser-/E2E-Test (optional im ersten Schritt)

Falls Playwright-Infrastruktur bereits nutzbar ist:

**Datei:** `tests/browser/web/task-board-dnd.spec.ts`

1. Karte aus Spalte A in Spalte B ziehen → Karte erscheint in Spalte B,
   verschwindet aus Spalte A (kein Reload nötig)
2. Karte in eigene Spalte zurückziehen → keine Änderung sichtbar

Wenn Playwright noch nicht stabil ist, diese Tests als offene Punkte im
Schritt-Log dokumentieren und nicht als leere Gerüste einchecken.

---

## Abnahmekriterien

- [ ] `@dnd-kit/core` und `@dnd-kit/sortable` sind im `apps/web`-Workspace installiert
- [ ] Im Board-Modus können Task-Karten zwischen Statusspalten gezogen werden
- [ ] Drop auf eigene Spalte: keine Mutation, keine Fehlermeldung
- [ ] Drop auf fremde bekannte Spalte: Task-Status ändert sich, Karte wandert in
      neue Spalte ohne Seitenreload
- [ ] Drop außerhalb einer Spalte: Karte kehrt visuell zur Ausgangsposition zurück
- [ ] Schlägt die Mutation fehl: Toast-Fehlermeldung, Karte kehrt in Ausgangsspalte zurück
- [ ] Listen-Modus unverändert: kein DnD, keine neuen DOM-Elemente
- [ ] Alle anderen Domain-Views (Tickets, Features usw.) unverändert und funktionsfähig
- [ ] Alle neuen Unit-Tests vorhanden und grün
- [ ] Bestehende Tests grün (`npm run test -w apps/web`)
- [ ] `npm run build` fehlerfrei
- [ ] Schritt-Log geschrieben

---

## Implementierungsreihenfolge

1. **Schritt 1 — Abhängigkeiten installieren**
   `@dnd-kit/core` und `@dnd-kit/sortable` in `apps/web` installieren.
   Build prüfen (`npm run build -w apps/web`), sicherstellen, dass keine
   Peer-Dependency-Konflikte entstehen.

2. **Schritt 2 — `useTasks`-Mutation prüfen / ergänzen**
   Bestehenden Update-Pfad in `useTasks` und `src/api/tasks.ts` lesen.
   Wenn der generische `updateTask`-Aufruf mit `{ status, expectedVersion }` bereits
   funktioniert, wird dieser wiederverwendet. Sonst schlanke
   `updateTaskStatus`-Mutation ergänzen. Invalidierung über `invalidation.ts`.

3. **Schritt 3 — `ListBoardView` erweitern**
   Prop `onItemStatusChange` ergänzen. Board-Rendering-Zweig in `DndContext` einbetten.
   Spalten als `useDroppable`, Karten als `useDraggable`. `DragOverlay` einfügen.
   `onDragEnd`-Logik mit allen Branching-Fällen implementieren.
   Kein Breaking Change: ohne Prop bleibt alles wie bisher.

4. **Schritt 4 — Callback-Kette verdrahten**
   `TaskListBoardView`: `onStatusChange`-Prop ergänzen, als `onItemStatusChange`
   an `ListBoardView` weitergeben.
   `OwnerTaskBoard`: `onStatusChange`-Handler implementieren, der
   `taskController.updateTaskStatus` (oder `updateTask`) aufruft.

5. **Schritt 5 — Tests schreiben**
   Unit-Tests für `ListBoardView.dnd` und `TaskListBoardView.dnd`.
   Bestehende Tests auf gebrochene Selektoren prüfen und anpassen.

6. **Schritt 6 — Abschluss**
   `npm run test -w apps/web` und `npm run build` seriell ausführen.
   Ergebnis berichten. Schritt-Log schreiben.
