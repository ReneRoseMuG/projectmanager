# Codex-Auftrag: WikiTree auf Dark-Sidebar-Stil umstellen

**Parent:** MILE-25 — Redesign Wiki
**Datum:** 2026-05-29
**Aufgaben-ID:** TASK-139

---

## Ziel

`WikiTree.tsx` erhält denselben visuellen Stil wie `AdminSidebar.tsx` — dunkler Steel-Gradient als Hintergrund, weiße Texte, konsistente Hover- und Aktiv-Zustände für Tree-Einträge. Der bisherige doppelte Header (eigener „Wiki"-Titel + „Neue Seite"-Button innerhalb des Trees) wird entfernt, da diese Information im übergeordneten `PageHero` bereits vorhanden ist.

## Hintergrund & Kontext

Die `AdminSidebar` verwendet `bg-gradient-to-b from-steel-800 to-steel-900` mit weißen Texten, `hover:bg-white/10` und `bg-white/10` für den aktiven Zustand. Der WikiTree soll diesen Stil übernehmen, um eine einheitliche sekundäre Navigationsspalte zu schaffen. Der WikiTree ist die linke Spalte des Wiki-Two-Pane-Layouts (wird in TASK-140 umgebaut).

Referenz-Implementierung: `apps/web/src/components/layout/AdminSidebar.tsx`

## Aufgabe

### 1. `aside`-Wrapper umgestalten

Ersetze die bisherigen Klassen:
```
rounded-lg border border-line bg-white p-4 shadow-sm
```
durch:
```
bg-gradient-to-b from-steel-800 to-steel-900 px-3 py-4 overflow-y-auto flex flex-col gap-1
```

### 2. Header-Bereich ersetzen

Entferne den bisherigen `<div>` mit `h2` („Wiki") und dem primären „Neue Seite"-Button vollständig.

Ersetze durch ein kompaktes Label + Ghost-Button:
```tsx
<div className="mb-2 flex items-center justify-between px-2">
  <span className="text-xs font-bold uppercase tracking-wide text-white/45">
    Seiten
  </span>
  <Button
    aria-label="Neue Root-Seite"
    title="Neue Root-Seite"
    icon={<Plus size={14} />}
    variant="ghost"
    className="text-white/60 hover:text-white hover:bg-white/10"
    onClick={() => onCreate(null)}
  />
</div>
```

### 3. Empty-State anpassen

Ersetze das `<EmptyState>`-Element durch eine inline-Darstellung im passenden Stil:
```tsx
<div className="px-2 py-6 text-center">
  <FileText size={20} className="mx-auto mb-2 text-white/30" />
  <p className="text-sm font-medium text-white/60">Keine Wiki-Seiten</p>
  <p className="mt-0.5 text-xs text-white/40">Starte mit einer Root-Seite.</p>
</div>
```

### 4. `WikiNode`-Links umgestalten

Ändere die Link-Klassen in `WikiNode`:

**Aktiver Zustand** (bisher `bg-steel-900 text-white`):
```
bg-white/10 text-white
```

**Inaktiver Zustand** (bisher `text-steel-700 hover:bg-shell`):
```
text-white/75 hover:bg-white/10 hover:text-white
```

### 5. Chevrons und Datei-Icons

Ändere die Farben der Expand/Collapse-Buttons und des Datei-Icons:
- Buttons: `text-white/50 hover:text-white hover:bg-white/10`
- `FileText`-Icon (Blatt ohne Kinder): `text-white/40`

### 6. „Unterseite anlegen"-Button

```
text-white/50 hover:text-white hover:bg-white/10
```

### 7. Wrapper `<div className="grid gap-1">` entfernen

Da der `aside` nun `flex flex-col gap-1` hat, ist das innere Grid-Div überflüssig. Die `WikiNode`-Elemente direkt rendern.

## Technische Leitplanken

- Keine Änderungen an `WikiNode`-Logik (Expand/Collapse, Rekursion, aktive ID-Erkennung)
- Keine neuen Props — nur Styling
- `EmptyState`-Import kann entfernt werden wenn nicht mehr verwendet
- Tailwind-Klassen aus dem vorhandenen Design-System verwenden (keine neuen Farben einführen)

## Seiteneffekte

- `WikiPage.tsx` rendert den `WikiTree` — das Layout-Handling wird in TASK-140 angepasst; dieser Task ändert nur die interne Darstellung
- Tests für `WikiTree` müssen auf geänderte CSS-Klassen geprüft werden (falls vorhanden)

## Testanforderungen

- Bestehende Unit-Tests für `WikiTree` prüfen und bei Bedarf CSS-Klassen anpassen
- Visuell prüfen: aktiver Node hat `bg-white/10`, inaktiver hat Hover-Effekt, Empty-State sichtbar auf dunklem Hintergrund

## Abnahmekriterien

- WikiTree hat denselben Dark-Gradient wie AdminSidebar
- Kein weißer Card-Hintergrund, kein Border, kein Shadow mehr
- Section-Label „Seiten" sichtbar in `text-white/45`
- Aktiver Tree-Eintrag: `bg-white/10 text-white`
- Inaktiver Tree-Eintrag: `text-white/75`, bei Hover `bg-white/10 text-white`
- Kein doppelter „Wiki"-Header oder primärer „Neue Seite"-Button im Tree
- Expand/Collapse funktioniert weiterhin korrekt
