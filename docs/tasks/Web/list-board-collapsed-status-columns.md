# Codex-Auftrag: Board/List View — kollabierte leere Status-Spalten

## Aufgabenbeschreibung

Leere Status-Spalten im Board View und leere Status-Gruppen im List View kollabieren automatisch auf eine definierte Mindestgröße. Sie bleiben sichtbar, als Drop-Target nutzbar und zeigen den Status-Namen an. Sobald sie Items enthalten (z. B. per Drop), kehren sie zur Normalgröße zurück.

## Scope

Eine Datei:

- `apps/web/src/components/ui/ListBoardView.tsx`

Keine Backend-Änderungen. Keine Änderungen an Entity-Komponenten.

---

## Schritt 1: Bestandsaufnahme (vor jeder Änderung)

Lese zunächst:

- `docs/design-richtlinien-visuell.md`
- `apps/web/src/components/ui/ListBoardView.tsx` (vollständig)

Erstelle eine Ist/Soll-Tabelle:

| Bereich | Ist | Soll |
|---|---|---|
| Board-Layout | `grid-flow-col auto-cols-[minmax(17rem,1fr)]` (einheitliche Breite) | `flex flex-nowrap` — leere Spalten erhalten `w-12 shrink-0`, befüllte `min-w-[17rem] flex-1` |
| Leere Board-Spalte | Volle Breite, leerer Content-Bereich | `w-12`: vertikaler Status-Label, kleiner `+` Button |
| Befüllte Board-Spalte | Unverändert | Unverändert |
| Leere List-Gruppe | Volle Breite, leere Content-Zeile | `min-h-0 h-12`: einzeilig, Status-Label + `+` Button horizontal |
| Befüllte List-Gruppe | Unverändert | Unverändert |
| Drop-Target kollabiert | Highlight durch `isOver` bereits vorhanden | Bleibt erhalten; kollabierte Spalte bleibt registrierter `useDroppable`-Node |
| Expand bei Drop | — | Sobald `group.items.length > 0`, rendert die Spalte normal |

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Board-Layout auf Flex umstellen

Ersetze im `renderStatusGroupedContent`-Block für `layout === "board"` den Grid-Container:

**Vorher:**
```tsx
const rootClass =
  layout === "board"
    ? "grid w-full min-w-0 grid-flow-col auto-cols-[minmax(17rem,1fr)] gap-4 overflow-x-auto pb-2"
    : "grid h-full min-h-[30rem] w-full flex-1 content-start gap-4";
```

**Nachher:**
```tsx
const rootClass =
  layout === "board"
    ? "flex w-full min-w-0 flex-nowrap gap-4 overflow-x-auto pb-2 items-start"
    : "grid h-full min-h-[30rem] w-full flex-1 content-start gap-4";
```

Jede Board-Spalte erhält einen Wrapper-`<div>` mit dynamischer Breite:

```tsx
<div
  key={group.column.value}
  className={
    group.items.length === 0
      ? "w-12 shrink-0 self-stretch"
      : "min-w-[17rem] flex-1 min-w-0"
  }
  style={{ minHeight: "max(30rem, 100%)" }}
>
  <Section ... />
</div>
```

---

## Schritt 3: Kollabierte Board-Spalte — neues Rendering

Erweitere `StatusSectionProps` und beide Section-Komponenten (`PlainStatusSection`, `DroppableStatusSection`) um eine `collapsed`-Prop:

```tsx
interface StatusSectionProps {
  // ... bestehend ...
  collapsed: boolean;
}
```

Wenn `collapsed === true`, rendert die Section einen vertikalen Layout-Modus statt des normalen Headers + Content:

```tsx
function CollapsedBoardSection({
  column,
  renderColumnAddButton,
  setNodeRef,    // nur für DroppableStatusSection
  isOver,
}: {
  column: StatusColumn;
  renderColumnAddButton: (column: StatusColumn) => ReactNode;
  setNodeRef?: (el: HTMLElement | null) => void;
  isOver?: boolean;
}) {
  return (
    <section
      ref={setNodeRef}
      className={`flex h-full w-full flex-col items-center gap-3 rounded-lg border py-3 transition ${
        isOver ? "ring-2 ring-fern/40 brightness-[1.02]" : ""
      } ${statusGroupClass(column)}`}
      style={statusGroupStyle(column)}
      data-status-column={column.value}
    >
      {/* Vertikaler Status-Label */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        <span className="truncate text-xs font-semibold text-steel-600">
          {column.label}
        </span>
      </div>
      {/* + Button */}
      <div className="shrink-0">
        {renderColumnAddButton(column)}
      </div>
    </section>
  );
}
```

In `PlainStatusSection` und `DroppableStatusSection`: wenn `collapsed`, `CollapsedBoardSection` rendern statt des normalen Aufbaus.

---

## Schritt 4: Kollabierte List-Gruppe

Im List View kollabiert eine leere Gruppe auf eine einzeilige Darstellung. Erweitere `StatusSectionHeader` um einen `collapsed`-Modus oder render einen separaten kompakten Header:

```tsx
// Innerhalb von PlainStatusSection / DroppableStatusSection, wenn collapsed + layout === "list":
<section
  className={`flex h-12 min-w-0 items-center justify-between gap-2 rounded-lg border px-3 ${
    isOver ? "ring-2 ring-fern/40 brightness-[1.02]" : ""
  } ${statusGroupClass(column)}`}
  style={statusGroupStyle(column)}
>
  <div className="flex min-w-0 items-center gap-2">
    <h2 className="min-w-0 truncate text-sm font-semibold text-steel-600">
      {column.label}
    </h2>
    <span className="rounded bg-steel-100 px-2 py-0.5 text-xs font-semibold text-steel-600">
      0
    </span>
  </div>
  {renderColumnAddButton(column)}
</section>
```

---

## Schritt 5: `collapsed`-Prop an Sections übergeben

In `renderStatusGroupedContent` die `collapsed`-Prop berechnen und übergeben:

```tsx
const collapsed = group.items.length === 0 && knownColumn;

return (
  <Section
    key={group.column.value}
    column={group.column}
    itemCount={group.items.length}
    knownColumn={knownColumn}
    layout={layout}
    collapsed={collapsed}
    renderColumnAddButton={renderColumnAddButton}
  >
    {/* Content-Bereich nur wenn nicht kollabiert */}
    {!collapsed ? (
      <div className="grid gap-3 p-3">
        {group.items.map(...)}
      </div>
    ) : null}
  </Section>
);
```

---

## Schritt 6: `+` Button in kollabierten Spalten

Der vorhandene `renderColumnAddButton` rendert einen quadratischen `h-9 w-9`-Button. In kollabierten Board-Spalten passt er bereits — der Button ist quadratisch und soll sichtbar bleiben. Keine Änderungen am Button selbst nötig.

**Hinweis:** Der Button hat `aria-label={`${column.label} hinzufügen`}` — das reicht für Accessibility auch im kollabierten Zustand.

---

## Schritt 7: Drag-Over auf kollabierten Spalten

Das `isOver`-Highlighting aus `useDroppable` funktioniert unverändert, da die Sections weiterhin als `DroppableStatusSection` mit `setNodeRef` registriert bleiben. Die `isOver`-Klasse `"ring-2 ring-fern/40 brightness-[1.02]"` gilt für kollabierte Spalten genauso.

Kein Expand-on-Hover beim Drag-Over — die Spalte bleibt kollabiert. Das Drop-Highlighting signalisiert die Verfügbarkeit. Sobald das Item gedroppt wurde und `group.items.length > 0` ist, rendert die Spalte beim nächsten Re-Render automatisch normal.

---

## Tests

### Unit-Tests

- Leere Board-Spalte (bekannte Spalte): kollabierte Breite, vertikaler Label sichtbar, `+` Button sichtbar
- Befüllte Board-Spalte: normale Breite, normaler Header
- Leere List-Gruppe: einzeilig mit Label und `+` Button
- Unbekannte Spalten (unknownStatusColumn) kollabieren **nicht** — sie haben keine `knownColumn`-Flag und sollen vollständig angezeigt bleiben
- Drop auf kollabierte Spalte: `DroppableStatusSection` hat `setNodeRef`; `isOver` triggert Highlight

### E2E-Tests

- Board View: leere Spalten kollabieren beim Laden der Seite
- Board View: Item per Drag-Drop auf kollabierte Spalte — Spalte expandiert nach Drop
- List View: leere Gruppe kollabiert; `+` Button öffnet Create-Dialog mit vorgebelegtem Status

---

## Akzeptanzkriterien

- [ ] Leere Board-Spalten (nur bekannte) kollabieren auf `w-12` mit vertikalem Status-Label
- [ ] Leere List-Gruppen (nur bekannte) kollabieren auf `h-12` mit horizontalem Label
- [ ] Kollabierte Spalten/Gruppen sind weiterhin valide Drop-Targets mit `ring`-Highlight bei Drag-Over
- [ ] `+` Button in kollabierten Spalten erreichbar und funktionsfähig
- [ ] Sobald Item vorhanden, normale Darstellung ohne manuelles Aufklappen
- [ ] Unbekannte Status-Gruppen kollabieren nicht
- [ ] Keine raw Tailwind-Farben (`slate-*`, `gray-*`) — nur Design-Tokens
- [ ] Alle Unit-Tests grün, keine bestehenden Tests gebrochen

---

## Referenz

- Design-Richtlinien: `docs/design-richtlinien-visuell.md`
- Einzige betroffene Datei: `apps/web/src/components/ui/ListBoardView.tsx`
- DnD-Kit: `@dnd-kit/core` (bereits eingebunden, keine neue Version nötig)
