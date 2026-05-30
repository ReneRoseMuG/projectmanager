# Codex-Auftrag: WikiPage Layout auf Flex-Two-Pane umbauen

**Parent:** MILE-25 — Redesign Wiki
**Datum:** 2026-05-29
**Aufgaben-ID:** TASK-140

---

## Ziel

`WikiPage.tsx` wird von einem Grid-Layout mit zwei Card-Elementen auf ein echtes Flex-Two-Pane-Layout umgebaut. `WikiTree` ist die fixe linke Sidebar, der Inhaltsbereich füllt den restlichen Platz. Beide Bereiche teilen sich denselben äußeren Container — keine separaten Card-Wrapper mehr.

## Hintergrund & Kontext

Aktuell verwendet `WikiPage.tsx` ein Grid mit `xl:grid-cols-[24rem_minmax(0,1fr)]` innerhalb eines scrollbaren Containers. Beide Panels (WikiTree und Detail) sind eigenständige Cards. Das Ergebnis wirkt visuell zufällig zusammengestellt.

Das neue Layout soll dem Muster von `AdminLayout.tsx` folgen: ein `flex`-Container auf der Seite, Sidebar links (fixe Breite), Content rechts (`flex-1`). Nach TASK-139 hat der WikiTree einen dunklen Hintergrund — das Two-Pane-Layout lässt ihn bündig zur Seitengrenze sitzen.

Referenz: `apps/web/src/components/layout/AdminLayout.tsx`

## Aufgabe

### 1. Äußeren Container anpassen

Der aktuelle Container-`div` unterhalb des `PageHero`:
```tsx
<div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-6 overflow-auto px-4 pt-4 md:px-5 md:pt-5">
```

Ersetzen durch einen einfachen Flex-Container ohne Padding und max-width-Begrenzung:
```tsx
<div className="flex min-h-0 flex-1 overflow-hidden">
```

### 2. Grid durch Flex ersetzen

Den bisherigen Grid-Wrapper:
```tsx
<div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
```
vollständig entfernen. `WikiTree` und der Inhaltsbereich werden direkte Kinder des neuen Flex-Containers.

### 3. WikiTree-Einbindung

```tsx
<WikiTree tree={wiki.tree} onCreate={openCreate} />
```

Der `WikiTree` bekommt keine zusätzlichen Wrapper-Klassen — seine Breite definiert er intern (ca. 280px, siehe TASK-139). Er füllt die volle Höhe des Flex-Containers durch `self-stretch` oder `h-full` im `aside`.

### 4. Inhaltsbereich

```tsx
<div className="flex flex-1 flex-col overflow-y-auto">
```

Dieser Bereich enthält:
- Fehleranzeige (falls `wiki.error`)
- `WikiBreadcrumb`
- `WikiPageDetail` oder `EmptyState` (wird in TASK-141 durch `WikiPageForm` inline ersetzt)

Kein `p-4`/`p-5` auf dem Container selbst — Padding kommt aus den Kindkomponenten.

### 5. Skeleton-Zustand

Der `TaskListSkeleton` beim Laden wird in den Inhaltsbereich verschoben:
```tsx
{wiki.loading ? (
  <div className="flex min-h-0 flex-1 overflow-hidden">
    <div className="w-[280px] shrink-0 bg-gradient-to-b from-steel-800 to-steel-900" />
    <div className="flex-1 p-5">
      <TaskListSkeleton />
    </div>
  </div>
) : (
  <div className="flex min-h-0 flex-1 overflow-hidden">
    <WikiTree ... />
    <div className="flex flex-1 flex-col overflow-y-auto">
      ...
    </div>
  </div>
)}
```

### 6. `WikiBreadcrumb` und Fehleranzeige

Beide erhalten Padding innerhalb des Inhaltsbereichs:
```tsx
<div className="px-5 pt-5">
  {wiki.error ? <div className="...">...</div> : null}
  <WikiBreadcrumb items={wiki.breadcrumb} />
</div>
```

## Technische Leitplanken

- `PageHero` bleibt unverändert oben (Titel „Wiki" + „Neue Seite"-Button)
- Kein `max-w-7xl` mehr — Wiki nutzt die volle Breite des Content-Bereichs
- Der `WikiTree`-`aside` bekommt kein explizites `width` als Wrapper-Prop — Breite ist intern in WikiTree definiert (TASK-139)
- `overflow-hidden` auf dem äußeren Container verhindert Doppel-Scrollbars

## Seiteneffekte

- `WikiTree.tsx` muss nach TASK-139 bereits den neuen Sidebar-Stil haben, damit das Layout korrekt aussieht
- `WikiPageDetail` und `EmptyState` im Inhaltsbereich sind temporär — werden in TASK-141 abgelöst
- Standalone-View-Routing (`withStandaloneView`) bleibt unverändert

## Testanforderungen

- `WikiPage.test.tsx` prüfen: DOM-Struktur hat sich geändert (kein Grid mehr)
- Visuell: Sidebar sitzt bündig am linken Rand, kein Gap zwischen Sidebar und Content

## Abnahmekriterien

- WikiTree und Inhaltsbereich in einem `flex`-Container, kein Grid
- WikiTree-Sidebar am linken Rand, volle Höhe
- Inhaltsbereich scrollt unabhängig von der Sidebar
- Kein äußeres Padding oder max-width auf dem Hauptcontainer
- Loading-Zustand zeigt korrekten Platzhalter für Sidebar und Content
