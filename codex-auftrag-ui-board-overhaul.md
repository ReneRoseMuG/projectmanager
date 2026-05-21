# Codex-Auftrag: UI-Überarbeitung Board/ListView, Karten und Status-Spalten

## Ziel

Mehrere visuelle Inkonsistenzen und überflüssige Elemente in der Board/ListView-Oberfläche,
den Status-Spalten und den Karten-/Row-Komponenten beheben. Alle Änderungen sind rein
visuell/strukturell – keine Logik, keine API-Anbindung verändert sich.

---

## Aufgabe 1 – Status-Spalten: + Button vereinheitlichen

**Problem:** `BacklogListBoardView` und `UseCaseListBoardView` übergeben kein `onAddToColumn`
an `ListBoardView`, obwohl alle anderen Adapter (Project, Feature, Milestone, Task, Ticket)
dies tun. Im Board-Modus fehlt der + Button in den Spalten deshalb für Backlog-Items und
Use Cases.

**Dateien:**
- `apps/web/src/components/backlog/BacklogListBoardView.tsx`
- `apps/web/src/components/usecases/UseCaseListBoardView.tsx`

**Änderung:**

In `BacklogListBoardView` das vorhandene `onCreate`-Prop als `onAddToColumn` weitergeben:
```tsx
// vorher
<ListBoardView
  onAdd={onCreate}
  ...
/>

// nachher
<ListBoardView
  onAdd={onCreate}
  onAddToColumn={onCreate}
  ...
/>
```

In `UseCaseListBoardView` analog: den vorhandenen `onCreate`-Handler auch als
`onAddToColumn` übergeben.

---

## Aufgabe 2 – Status-Spalten: Kopfbereich hervorheben und Leerraum reduzieren

**Problem:** Der Header einer Status-Spalte hat kein eigenes visuelles Gewicht.
Er sitzt mit dem gleichen `p-3` der umgebenden `<section>` bündig – kein
Background, kein Trenner, kein kompakterer oberer Abstand.

**Datei:** `apps/web/src/components/ui/ListBoardView.tsx`

Es gibt zwei Stellen mit Status-Spalten-Header – List-Modus (~Zeile 220) und
Board-Modus (~Zeile 247). Beide anpassen.

**Änderung – section:** Padding oben auf 0 setzen, damit der Header-Bereich
direkt bündig am Rand liegt. Den Inhaltsbereich in einen eigenen div einwickeln:

```tsx
// vorher (beide Stellen)
<section ... className={`... p-3 ...`}>
  <header className="flex min-w-0 items-center justify-between gap-3">
    ...
  </header>
  <div className="grid gap-3">
    {/* karten/rows */}
  </div>
</section>

// nachher
<section ... className={`... overflow-hidden p-0 ...`}>
  <header className="flex min-w-0 items-center justify-between gap-2
                     bg-white/60 px-3 py-2 backdrop-blur-sm border-b border-line/60">
    ...
  </header>
  <div className="grid gap-3 p-3">
    {/* karten/rows */}
  </div>
</section>
```

**Ergebnis:** Der Kopfbereich hebt sich optisch von den Karten ab (leicht getöntes
Weiß, kompakteres Padding mit Trennlinie), der Labeltext sitzt eng am oberen Rand.

---

## Aufgabe 3 – Button-Höhe angleichen: ViewToggle vs. FilterChips

**Problem:** `ViewToggle`-Buttons und der Haupt-Add-Button sind `h-10` (40 px),
`FilterChips`-Chips sind `h-9` (36 px). In der Toolbar-Zeile von `ListBoardView`
stehen sie nebeneinander – der Höhenunterschied fällt störend auf.

**Datei:** `apps/web/src/components/ui/FilterChips.tsx`

**Änderung:** `h-9` auf `h-10` anheben:

```tsx
// vorher
`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm ...`

// nachher
`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm ...`
```

---

## Aufgabe 4 – Icons aus Karten entfernen

**Problem:** `ProjectCard`, `MilestoneCard`, `FeatureCard` und `UseCaseCard` rendern
jeweils ein großes farbiges Icon-Badge im Karten-Header, das wertvollen Platz für den
Titel nimmt. Der Nutzer möchte Icons im Hero-Bereich der jeweiligen Detailseite sehen,
nicht auf jeder Karte.

### 4a – PlanningItemCard (betrifft ProjectCard und MilestoneCard)

**Datei:** `apps/web/src/components/ui/PlanningItemCard.tsx`

`PlanningHeader` rendert derzeit `<PlanningAvatar>` (48×48 px) neben dem Titel.
Den Avatar-Block entfernen:

```tsx
// PlanningHeader – vorher
<div className="flex min-w-0 items-start gap-3">
  <PlanningAvatar accentColor={accentColor} icon={icon} />
  <div className="min-w-0">
    <h2 ...>{title}</h2>
  </div>
</div>

// PlanningHeader – nachher
<div className="min-w-0">
  <h2 className="line-clamp-2 break-words text-base font-semibold text-ink">{title}</h2>
  {subtitle ? <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p> : null}
</div>
```

Die Row-Variante übergibt `statusIndicator={<PlanningAvatar .../>}` an `ItemRow`.
Dort den `statusIndicator` ebenfalls entfernen (Prop auf `undefined` setzen).

Die `PlanningAvatar`-Komponente und das `icon`-Prop in `PlanningItemCardProps` können
vorerst erhalten bleiben (für spätere Verwendung im Hero-Bereich), aber nicht mehr
im Karten-Rendering verwendet werden.

### 4b – FeatureCard

**Datei:** `apps/web/src/components/features/FeatureCard.tsx`

`FeatureCardHeader` rendert einen 52×52 px Icon-Block. Diesen entfernen:

```tsx
// vorher
<div className="flex min-w-0 items-center gap-3">
  <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-steel-600 text-white shadow-steel-icon">
    <BookOpen size={22} />
  </span>
  <span className="min-w-0">
    <span className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</span>
    {/* slug wird in Aufgabe 5 entfernt */}
    <span className="mt-2 inline-flex"><StatusPill kind="featureStatus" value={feature.status} /></span>
  </span>
</div>

// nachher
<div className="grid gap-2">
  <span className="line-clamp-2 text-base font-semibold text-ink">{feature.title}</span>
  <StatusPill kind="featureStatus" value={feature.status} />
</div>
```

### 4c – UseCaseCard

**Datei:** `apps/web/src/components/usecases/UseCaseCard.tsx`

`UseCaseBadge` (40×40 px Icon) wird im Karten-Header und in der Row-Variante als
`statusIndicator` verwendet. Beides entfernen.

Karten-Header ohne Badge:
```tsx
// vorher
<div className="flex items-start gap-3">
  <UseCaseBadge useCase={useCase} />
  <div className="min-w-0">
    <h3 ...>{useCase.title}</h3>
    {/* slug wird in Aufgabe 5 entfernt */}
  </div>
</div>

// nachher
<h3 className="line-clamp-2 text-sm font-semibold text-ink">{useCase.title}</h3>
```

Row-Variante: `statusIndicator` aus dem `<ItemRow>`-Aufruf entfernen.

---

## Aufgabe 5 – Slug-Anzeige aus Karten und Rows entfernen

**Problem:** Slug-Pfade werden in Karten und List-Rows angezeigt, obwohl sie für
den Nutzer keinen Mehrwert bieten und Platz verschwenden.

Folgende Stellen entfernen:

| Datei | Bereich | Zu entfernender Ausdruck |
|---|---|---|
| `components/features/FeatureCard.tsx` | FeatureCardHeader (~Z.39) | `<span className="block truncate font-mono text-xs ...">/features/{feature.slug}</span>` |
| `components/features/FeatureRelationPanel.tsx` | (~Z.64) | `<span className="block truncate font-mono text-[11px] ...">/features/{feature.slug}</span>` |
| `components/usecases/UseCaseCard.tsx` | Row meta (~Z.38) | `meta={<span className="font-mono text-xs ...">/uc/{useCase.slug}</span>}` |
| `components/usecases/UseCaseCard.tsx` | Card header (~Z.56) | `<p className="mt-1 truncate font-mono text-[11px] ...">/uc/{useCase.slug}</p>` |
| `components/usecases/UseCaseRelationPanel.tsx` | (~Z.55) | `<span className="block truncate font-mono text-[11px] ...">/use-cases/{useCase.slug}</span>` |

In `FeatureRelationPanel` und `UseCaseRelationPanel` prüfen, ob durch das Entfernen
des Slug-Elements ein Layout-Leerraum entsteht – ggf. umgebenden Container anpassen.

---

## Aufgabe 6 – Edit/Delete → vertikales Drei-Punkt-Menü

**Problem:** `ItemCard`, `PlanningItemCard` (Row-Variante) und `TaskCard` (Row-Variante)
zeigen je zwei separate Icon-Buttons (Edit3 + Trash2). Der Nutzer möchte ein schmales
vertikales Drei-Punkt-Menü, das beide Aktionen enthält und später erweiterbar ist.

### 6a – Neue Komponente `ActionMenu` erstellen

**Datei (neu):** `apps/web/src/components/ui/ActionMenu.tsx`

```tsx
import { MoreVertical, type LucideIcon } from "lucide-react";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { Button } from "./Button";

export interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
}

export function ActionMenu({ items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        aria-label="Aktionen"
        title="Aktionen"
        icon={<MoreVertical size={18} />}
        variant="ghost"
        className="h-8 w-6 px-0"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      />
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-line bg-white py-1 shadow-panel">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition hover:bg-steel-50
                ${item.danger ? "text-crimson hover:bg-crimson/5" : "text-ink"}`}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6b – `ItemCard` anpassen

**Datei:** `apps/web/src/components/ui/ItemCard.tsx`

`Edit3`/`Trash2`-Buttons durch `ActionMenu` ersetzen:

```tsx
// Import ergänzen
import { ActionMenu } from "./ActionMenu";
import { Edit3, Trash2 } from "lucide-react";

// vorher
{onEdit || onDelete ? (
  <div className="relative z-20 flex shrink-0 gap-1">
    {onEdit ? <Button aria-label="Bearbeiten" ... icon={<Edit3 size={18} />} onClick={...} /> : null}
    {onDelete ? <Button aria-label="Löschen" ... icon={<Trash2 size={18} />} onClick={...} /> : null}
  </div>
) : null}

// nachher
{(onEdit || onDelete) ? (
  <div className="relative z-20 shrink-0">
    <ActionMenu items={[
      ...(onEdit  ? [{ label: "Bearbeiten", icon: <Edit3 size={16} />,  onClick: onEdit }] : []),
      ...(onDelete ? [{ label: "Löschen",    icon: <Trash2 size={16} />, onClick: onDelete, danger: true }] : []),
    ]} />
  </div>
) : null}
```

### 6c – `PlanningItemCard` Row-Variante anpassen

**Datei:** `apps/web/src/components/ui/PlanningItemCard.tsx`

```tsx
// Import ergänzen
import { ActionMenu } from "./ActionMenu";

// vorher
actions={
  <>
    <Button aria-label="Bearbeiten" ... icon={<Edit3 size={18} />} onClick={onEdit} />
    <Button aria-label="Löschen"    ... icon={<Trash2 size={18} />} onClick={onDelete} />
  </>
}

// nachher
actions={
  <ActionMenu items={[
    { label: "Bearbeiten", icon: <Edit3 size={16} />,  onClick: onEdit },
    { label: "Löschen",    icon: <Trash2 size={16} />, onClick: onDelete, danger: true },
  ]} />
}
```

### 6d – `TaskCard` (TaskRow) anpassen

**Datei:** `apps/web/src/components/tasks/TaskCard.tsx`

```tsx
// Import ergänzen
import { ActionMenu } from "../ui/ActionMenu";

// vorher (in TaskRow)
actions={
  <>
    <Button aria-label="Bearbeiten" ... icon={<Edit3 size={18} />} onClick={() => onOpen(task)} />
    {onDelete ? <Button aria-label="Löschen" ... icon={<Trash2 size={18} />} onClick={() => onDelete(task)} /> : null}
  </>
}

// nachher
actions={
  <ActionMenu items={[
    { label: "Bearbeiten", icon: <Edit3 size={16} />, onClick: () => onOpen(task) },
    ...(onDelete ? [{ label: "Löschen", icon: <Trash2 size={16} />, onClick: () => onDelete(task), danger: true }] : []),
  ]} />
}
```

---

## Reihenfolge der Umsetzung

1. **Aufgabe 6a** zuerst: `ActionMenu`-Komponente erstellen (Grundlage für 6b–6d).
2. **Aufgaben 6b–6d** parallel: `ItemCard`, `PlanningItemCard`, `TaskCard` anpassen.
3. **Aufgabe 5**: Slugs aus Karten und RelationPanels entfernen.
4. **Aufgabe 4**: Icons aus Karten entfernen (nach Slug-Bereinigung sauberer).
5. **Aufgaben 1–3**: `onAddToColumn`, Status-Spalten-Header, Button-Höhe – unabhängig voneinander umsetzbar.

---

## Nicht in diesem Auftrag enthalten

- Hero-Bereich der Detailseiten mit Icon anreichern (separater Folgeauftrag).
- Slug-Felder in Formularen (FeatureForm, UseCaseForm) bleiben erhalten – Slugs sind
  ein API-Konzept, nur die Darstellung in Karten entfällt.
- `WikiPageDetail.tsx` und `BacklogItemForm.tsx` zeigen ebenfalls Slugs, aber nicht
  in Board-Karten – außerhalb des Scope dieses Auftrags.

---

## Aufgabe 7 – Tests

### 7a – Neuer Unit-Test für ActionMenu

**Datei (neu):** `tests/unit/web/components/ui/ActionMenu.test.tsx`

Die `ActionMenu`-Komponente hat echte Interaktionslogik, die abgesichert werden muss.

Folgende Fälle abdecken:

```
- Menü ist standardmäßig geschlossen (kein Dropdown sichtbar)
- Klick auf den MoreVertical-Button öffnet das Dropdown
- Klick auf einen Menüeintrag ruft dessen onClick auf und schließt das Dropdown
- Klick außerhalb des Dropdowns schließt es (mousedown auf document)
- Danger-Einträge erhalten eine rote Textklasse (text-crimson)
- stopPropagation: Click-Events auf Einträgen bubbeln nicht weiter
```

Muster aus bestehenden UI-Tests übernehmen (vitest + @testing-library/react, jsdom-Umgebung, cleanup in afterEach).

### 7b – Bestehende Tests anpassen

Die folgenden Tests werden nach den Änderungen fehlschlagen und müssen aktualisiert werden:

| Testdatei | Betroffen durch | Nötige Anpassung |
|---|---|---|
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | Aufgabe 6b | Prüfungen auf `aria-label="Bearbeiten"` / `aria-label="Löschen"` Buttons ersetzen durch Prüfung auf `aria-label="Aktionen"` (ActionMenu-Trigger) |
| `tests/unit/web/components/ui/BacklogListBoardView.test.tsx` | Aufgabe 1 | Prüfen, dass Spalten-Plus-Button nun auch im Backlog-Board erscheint |
| `tests/unit/web/components/ui/UseCaseListBoardView.test.tsx` | Aufgabe 1 | Analog Backlog |
| `tests/unit/web/components/ui/FeatureListBoardView.test.tsx` | Aufgaben 4b, 5 | Prüfungen auf Slug-Text (`/features/...`) und Icon-Block entfernen |
| `tests/unit/web/components/ui/MilestoneListBoardView.test.tsx` | Aufgabe 4a | Prüfungen auf `PlanningAvatar`-Element entfernen |
| `tests/unit/web/components/ui/ProjectListBoardView.test.tsx` | Aufgabe 4a | Analog Milestone |
| `tests/unit/web/components/ui/TaskListBoardView.test.tsx` | Aufgabe 6d | Analog ListBoardView: Edit/Delete-Button-Prüfungen auf ActionMenu-Trigger umstellen |

**Hinweis:** Keine der Anpassungen erfordert neue Testlogik – es geht nur darum, die selectors an die neuen DOM-Strukturen anzupassen. Neue Verhaltensregeln (ActionMenu-Logik) werden ausschließlich in 7a abgedeckt.
