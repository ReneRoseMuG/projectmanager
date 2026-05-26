# Codex-Auftrag: ItemCard Höhenangleich via grid-template-rows generisch lösen

**Parent:** MILE-17 — Board UI: Karten-Vereinheitlichung & Status-Footer
**Datum:** 2026-05-26
**Aufgaben-ID:** 64

---

## Ziel

Karten im Board-View sollen innerhalb jeder Kanban-Spalte einheitlich hoch sein. Das
interne Layout von `ItemCard` soll so umgebaut werden, dass Header und Footer immer
gleich proportioniert sind und der Body-Bereich den verbleibenden Platz füllt. Der
bereits vorhandene `equalItemHeight`-Mechanismus in `ListBoardView` wird korrigiert,
sodass er für den Kanban-Board-Modus spaltenweise statt global equalisiert und `height`
statt `minHeight` setzt, damit `h-full` in `ItemCard` greift.

## Hintergrund & Kontext

`ListBoardView.tsx` enthält bereits eine Höhenangleichungs-Logik (State `equalItemHeight`,
`useLayoutEffect` ab Zeile ~773). Sie hat aber zwei Defekte:

1. **`minHeight` statt `height`**: `ItemCard` nutzt `h-full`, das eine explizite `height`
   am Elternelement voraussetzt. Mit `minHeight` bleibt `h-full` wirkungslos — die Karte
   wird nicht auf die Wrapper-Höhe gestreckt.

2. **Globale statt spaltenweise Equalisierung**: Die Logik findet das Maximum über ALLE
   `[data-equal-item="true"]`-Elemente im gesamten Board, inklusive aller Spalten. Das
   führt dazu, dass der Höchstwert einer besonders langen Karte in der „Geschlossen"-
   Spalte auch auf alle Karten in „Offen" und „In Arbeit" angewendet wird.

Außerdem verwendet `ItemCard` ein CSS-Grid (`grid h-full gap-3`) ohne definierte
`grid-template-rows`. Wenn kein Body gerendert wird, landet der Footer direkt unter dem
Header statt am Kartenende.

## Aufgabe

### Schritt 1 — `ItemCard.tsx` auf `flex flex-col` umstellen

Datei: `apps/web/src/components/ui/ItemCard.tsx`

- `<article>`-Klasse: `grid h-full` → `flex flex-col h-full`
- Header-Wrapper (`<div className="flex items-start justify-between gap-3">`):
  `shrink-0` ergänzen, damit er sich nicht zusammenzieht.
- Body-Wrapper (`<div className="min-w-0">{body}</div>`):
  `flex-1 min-h-0` ergänzen, damit er den verbleibenden Platz füllt.
- Footer (`<footer className="mt-auto min-w-0">`): bleibt unverändert; `mt-auto` ist
  bei `flex-col` korrekt.

Resultat: Header hat natürliche Höhe, Body wächst, Footer klebt immer am Kartenende —
unabhängig davon, ob Body-Inhalt vorhanden ist.

### Schritt 2 — `ListBoardView.tsx`: spaltenweise Equalisierung + `height` statt `minHeight`

Datei: `apps/web/src/components/ui/ListBoardView.tsx`

Die bestehende `equalItemHeight`-Logik im `useLayoutEffect` ersetzen:

```typescript
useLayoutEffect(() => {
  const root = rootRef.current;
  if (!root || loading) {
    setEqualItemHeight(undefined);
    return;
  }

  if (boardByStatus) {
    // Board-Modus: spaltenweise equalisieren, direkt per DOM-Style
    const columnWrappers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-status-column-wrapper]")
    );
    columnWrappers.forEach((wrapper) => {
      // Nur nicht-kollabierte Spalten berücksichtigen
      if (wrapper.dataset.statusCollapsedWrapper === "true") return;
      const nodes = Array.from(
        wrapper.querySelectorAll<HTMLElement>("[data-equal-item='true']")
      );
      if (nodes.length === 0) return;
      // Zuerst alle height-Overrides zurücksetzen für saubere Messung
      nodes.forEach((node) => { node.style.height = ""; });
      const maxHeight = Math.ceil(
        nodes.reduce((acc, node) => Math.max(acc, node.getBoundingClientRect().height), 0)
      );
      if (maxHeight > 0) {
        nodes.forEach((node) => { node.style.height = `${maxHeight}px`; });
      }
    });
    // State bleibt undefined; board nutzt direkte DOM-Manipulation
    setEqualItemHeight(undefined);
  } else {
    // List-Modus: globale Equalisierung (bisheriges Verhalten, aber height statt minHeight)
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-equal-item='true']")
    );
    if (nodes.length === 0) {
      setEqualItemHeight(undefined);
      return;
    }
    nodes.forEach((node) => { node.style.height = ""; });
    const maxHeight = Math.ceil(
      nodes.reduce((acc, node) => Math.max(acc, node.getBoundingClientRect().height), 0)
    );
    setEqualItemHeight(maxHeight > 0 ? maxHeight : undefined);
  }
}, [boardByStatus, hasStatusGrouping, items, loading, mode]);
```

Gleichzeitig `equalItemStyle` auf `height` statt `minHeight` ändern:

```typescript
const equalItemStyle = equalItemHeight ? { height: equalItemHeight } : undefined;
```

Hinweis: Im Board-Modus wird `equalItemHeight` nie gesetzt (bleibt `undefined`), weil die
Equalisierung direkt per DOM-Style erfolgt. Das ist nötig, weil React sonst nach dem
`setState` einen Re-Render auslöst und die DOM-Mutation überschreibt.

### Schritt 3 — Regression sicherstellen

- Alle Domänenkarten (`TaskCard`, `TicketCard`, `FeatureCard`, `UseCaseCard`) unverändert
  lassen — sie profitieren automatisch durch `ItemCard`.
- List-View mit Zeilenansicht testen: `ItemRow` ist nicht betroffen.
- `CardGrid` (statuslose Board-Ansicht ohne Kanban-Spalten) testen: hier greift der
  globale List-Modus-Pfad.

## Technische Leitplanken

- Kein Breaking Change an den Props von `ItemCard` oder `ListBoardView`.
- Keine neuen Abhängigkeiten.
- Die direkte DOM-Manipulation im `useLayoutEffect` ist bewusst gewählt, um einen
  zusätzlichen Re-Render-Zyklus zu vermeiden. Der Effect läuft nach dem Commit, bevor
  der Browser malt (`useLayoutEffect`), daher ist kein Flickern zu erwarten.
- Tailwind-Klassen für `flex flex-col h-full` sind bereits im Projekt vorhanden —
  kein `safelist`-Eintrag nötig.

## Regeln & Randfälle

- Kollabierte Spalten (`data-status-collapsed-wrapper="true"`) werden bei der
  spaltenweisen Equalisierung übersprungen.
- Spalten ohne Karten (leere Spalten, die nur den Collapsed-State anzeigen) werden
  ebenfalls übersprungen.
- Der `useLayoutEffect` läuft neu, wenn `items`, `mode`, `loading`, `boardByStatus`
  oder `hasStatusGrouping` sich ändern — das ist korrekt und ausreichend.

## Seiteneffekte

- `DragOverlay` in `ListBoardView` rendert eine separate Kopie der Karte; diese ist
  nicht von der Equalisierung betroffen (kein `data-equal-item`-Attribut).
- `FeatureCardSkeleton` ist eine eigenständige Skeleton-Komponente; sie hat kein
  `h-full` und ist nicht betroffen.

## Testanforderungen

- **Unit-Test `ItemCard`**: Bestätigen, dass die Komponente mit und ohne `body`/`footer`
  korrekt rendert (kein Snapshot-Test, nur strukturelle Prüfung).
- **Manueller Test**: Board-View mit mehreren Karten unterschiedlicher Höhe in einer
  Spalte aufrufen und verifizieren, dass alle Karten die gleiche Höhe bekommen.
- **Manueller Test**: List-View aufrufen und verifizieren, dass Zeilenkarten (ItemRow)
  unverändert aussehen.

## Abnahmekriterien

- Im Kanban-Board haben alle Karten innerhalb einer Spalte die gleiche Höhe.
- Karten in verschiedenen Spalten können unterschiedliche Höhen haben (korrekt).
- In jeder Karte sitzt der Footer immer am unteren Rand, auch wenn kein Body-Inhalt
  vorhanden ist.
- Der Body-Bereich einer Karte füllt den verfügbaren Platz zwischen Header und Footer.
- Kein Flickern beim initialen Laden des Boards.
- Der List-View (Zeilenansicht) ist visuell unverändert.
