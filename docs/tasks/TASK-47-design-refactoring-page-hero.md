# TASK-47 – Design Refactoring: einheitliche `PageHero`-Basiskomponente und Sidebar-Alignment

## Kontext

Die App hat aktuell zwei visuell inkonsistente Hero-Bereiche:

- **Listenansichten** (MilestonesPage, ProjectsPage, TasksPage, TicketsPage, FeaturesPage, WikiPage, …): nutzen `PageHeader` – schlichter weißer Kopf, variable Höhe, keine Hintergrundfarbe.
- **Detailseiten** (MilestoneForm, ProjectForm, …): nutzen `DetailModal` mit `variant="page"` – dunkler Gradient-Header (`from-steel-700 to-steel-600`), Breadcrumb, großer weißer Titel, MetaPills.
- **Sidebar-Kopf**: PM-Icon + Titel + Actions (Collapse, Refresh) + Suchfeld – fließend gestapelt, Höhe nicht kontrolliert, fluchtet nicht mit dem Hero-Bereich der rechten Spalte.

Ziel ist eine gemeinsame `PageHero`-Basiskomponente, die in beiden Seitentypen denselben Farbton und dieselbe Höhe erzeugt. Durch eine CSS-Variable `--hero-h` am App-Layout-Level wird der Sidebar-Kopf exakt auf die gleiche Höhe gesetzt, sodass seine Unterkante bündig mit der Unterkante des Hero-Bereichs fluchtet.

---

## Scope

Folgende Dateien sind zu ändern oder neu zu erstellen:

```
apps/web/src/
  components/
    ui/
      PageHero.tsx          ← NEU (ersetzt PageHeader für Hauptseiten)
    layout/
      Sidebar.tsx           ← Kopfbereich umstrukturieren
  pages/
    MilestonesPage.tsx      ← PageHero statt PageHeader
    ProjectsPage.tsx        ← PageHero statt PageHeader
    TasksPage.tsx           ← PageHero statt PageHeader
    TicketsPage.tsx         ← PageHero statt PageHeader
    FeaturesPage.tsx        ← PageHero statt PageHeader
    WikiPage.tsx            ← PageHero statt PageHeader
    CalendarPage.tsx        ← PageHero statt PageHeader
    JournalPage.tsx         ← PageHero statt PageHeader
    SettingsBackupPage.tsx  ← PageHero statt PageHeader (falls im Shell)
    SettingsPreferencesPage.tsx ← PageHero statt PageHeader
    admin/
      RolesPage.tsx         ← PageHero statt PageHeader
      UsersPage.tsx         ← PageHero statt PageHeader
  components/ui/
    DetailModal.tsx         ← Header durch PageHero ersetzen
  App.tsx                   ← Layout-Variable --hero-h setzen; Liste der
                               full-bleed-Routen erweitern
```

---

## Schritt 1 – CSS-Variable `--hero-h` am Layout-Root

In `App.tsx` wird die CSS-Variable `--hero-h` am äußersten Container gesetzt. Alle nachgelagerten Komponenten lesen sie aus.

```tsx
// App.tsx – äußerster flex-Container (derzeit: "flex h-screen overflow-hidden bg-shell text-ink")
<div
  className="flex h-screen overflow-hidden bg-shell text-ink"
  style={{ "--hero-h": "128px" } as React.CSSProperties}
>
```

Der Wert `128px` deckt den vollständigen Sidebar-Kopf ab (PM-Block + Titel + Suchfeld inkl. Innenabstände). Passe den Wert an, falls du die Höhe des PM-Blocks änderst.

**Achtung:** Detail-Seiten haben bereits `fullBleedDetailRoute` (p-0). Erweitere die Bedingung so, dass auch alle Listenrouten (`/milestones`, `/projects`, `/tasks`, `/tickets`, `/features`, `/wiki`, `/calendar`, `/journal`, `/settings/*`, `/admin/*`) `p-0` erhalten – analog zu den Detail-Routen. Der bisherige `p-4 md:p-6` auf `<main>` entfällt für diese Seiten; das Padding wird stattdessen im Seiteninhalt unterhalb des Hero gesetzt.

```tsx
// App.tsx – ersetze die fullBleedDetailRoute-Logik durch eine allgemeinere Prüfung
const fullBleedRoute =
  /^\/(milestones|projects|tasks|tickets|features|wiki|calendar|journal|settings|admin)(\/|$)/.test(
    location.pathname,
  );

const mainClass = `flex min-h-0 min-w-0 flex-1 flex-col ${
  fullBleedRoute ? "overflow-hidden p-0" : "overflow-auto p-4 md:p-6"
}`;
```

---

## Schritt 2 – Neue Komponente `PageHero`

Erstelle `apps/web/src/components/ui/PageHero.tsx`:

```tsx
import type { ReactNode } from "react";

interface PageHeroListProps {
  variant: "list";
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Optionale Filter-/Toolbar-Zeile direkt unter dem Titel (wird im Hero gerendert). */
  toolbar?: ReactNode;
}

interface PageHeroDetailProps {
  variant: "detail";
  title: string;
  breadcrumb?: string[];
  subtitle?: string;
  /** Badge-artige Pills (Status, Datum, …). */
  metaPills?: ReactNode;
  /** Freitext-Meta-Info rechts oben. */
  actions?: ReactNode;
}

type PageHeroProps = PageHeroListProps | PageHeroDetailProps;

/**
 * Einheitlicher Hero-Header für Listen- und Detailseiten.
 * Höhe wird durch die CSS-Variable --hero-h kontrolliert (Layout-Root).
 * Hintergrundfarbe entspricht dem Sidebar-Gradienten.
 */
export function PageHero(props: PageHeroProps) {
  const isDetail = props.variant === "detail";

  return (
    <header
      className="relative shrink-0 overflow-hidden border-b border-steel-700 bg-gradient-to-br from-steel-700 to-steel-600 px-5 text-white md:px-6"
      style={{ height: "var(--hero-h, 128px)" }}
    >
      {/* Dekorativer Hintergrundkreis (übernommen aus DetailModal) */}
      <div className="pointer-events-none absolute -right-8 -top-32 h-80 w-80 rounded-full bg-white/12 blur-sm" />

      <div className="relative flex h-full flex-col justify-between py-4">
        {/* Obere Zeile: Breadcrumb (Detail) oder leer (List) + Actions */}
        <div className="flex items-start justify-between gap-3">
          {isDetail && props.breadcrumb && props.breadcrumb.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
              {props.breadcrumb.map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                  {index > 0 ? <span className="text-white/30">/</span> : null}
                  <span>{item}</span>
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}
          {props.actions ? (
            <div className="flex shrink-0 items-center gap-2">{props.actions}</div>
          ) : null}
        </div>

        {/* Mittlere Zone: Titel */}
        <div>
          <h1
            className={`leading-tight tracking-normal text-white ${
              isDetail ? "text-2xl font-bold md:text-3xl" : "text-xl font-bold md:text-2xl"
            }`}
          >
            {props.title}
          </h1>
          {props.subtitle ? (
            <p className="mt-0.5 text-sm text-white/60">{props.subtitle}</p>
          ) : null}
        </div>

        {/* Untere Zone: MetaPills (Detail) oder Toolbar (List) */}
        {isDetail && props.metaPills ? (
          <div className="flex flex-wrap items-center gap-2">{props.metaPills}</div>
        ) : !isDetail && props.toolbar ? (
          <div className="flex items-center gap-3">{props.toolbar}</div>
        ) : (
          <span />
        )}
      </div>
    </header>
  );
}
```

**Hinweis zur Toolbar auf Listenansichten:** Die bisherige `ProjectMilestoneFilterBar` ist für helle Hintergründe gestylt (weiße `<select>`-Elemente). Wenn die Toolbar im dunklen Hero erscheinen soll, müssen die Select-Elemente auf `bg-white/10 border-white/20 text-white` umgestellt werden. Falls das zu aufwändig ist, kann die Toolbar **unterhalb** des Hero (auf weißem Hintergrund) bleiben – dann entfällt der `toolbar`-Slot und die FilterBar bleibt unverändert.

---

## Schritt 3 – `DetailModal.tsx` anpassen

Ersetze den `<header>`-Block in `DetailModal` durch `<PageHero variant="detail">`. Der Close-Button und der `onOpenInTab`-Button werden als `actions` prop übergeben.

```tsx
// DetailModal.tsx – vorher:
<header className="relative overflow-hidden border-b border-steel-700 bg-gradient-to-br ...">
  {/* … */}
</header>

// Nachher:
<PageHero
  variant="detail"
  title={title}
  subtitle={subtitle}
  breadcrumb={breadcrumb}
  metaPills={metaPills || metaInfo ? <>{metaPills}{metaInfo}</> : undefined}
  actions={
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/12 hover:text-white"
      aria-label="Schließen"
      onClick={onClose}
    >
      <X size={18} />
    </button>
  }
/>
```

Importiere `PageHero` aus `"./PageHero"`.

---

## Schritt 4 – `Sidebar.tsx` Kopfbereich umstrukturieren

Der Sidebar-Kopf erhält `height: var(--hero-h, 128px)` und eine neue interne Struktur:

```tsx
// Sidebar.tsx – expanded state, vorher: die zwei <div>-Blöcke mit PM-Icon + Titel + SearchInput
// Nachher: ein einzelner <div> mit fester Höhe

{!collapsed ? (
  <div
    className="flex flex-col gap-0 border-b border-white/12"
    style={{ height: "var(--hero-h, 128px)" }}
  >
    {/* PM-Block: Icon-Fläche + schmale Footer-Bar mit Actions */}
    <div className="mx-3 mt-2 overflow-hidden rounded-lg border border-white/15 bg-white/6">
      {/* Icon-Fläche */}
      <div className="flex h-10 items-center justify-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-sm font-bold text-steel-700 shadow-steel-icon">
          PM
        </span>
      </div>
      {/* Footer-Bar */}
      <div className="flex border-t border-white/12" style={{ height: "26px" }}>
        <button
          type="button"
          className="flex flex-1 items-center justify-center text-white/50 transition hover:bg-white/5 hover:text-white"
          aria-label="Aktualisieren"
          title="Aktualisieren"
          onClick={() => void invalidateWikiImportData(queryClient)}
        >
          <RefreshCw size={13} />
        </button>
        <div className="w-px bg-white/12" />
        <button
          type="button"
          className="flex flex-1 items-center justify-center text-white/50 transition hover:bg-white/5 hover:text-white"
          aria-label={collapseToggleLabel}
          title={collapseToggleLabel}
          onClick={toggleCollapsed}
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    </div>

    {/* App-Titel */}
    <div className="py-1 text-center text-[11px] font-medium text-white/50">
      Projekt Manager
    </div>

    {/* Suchfeld – füllt den verbleibenden Platz, Unterkante = Hero-Unterkante */}
    <div
      className="mx-3 mb-2 flex-1"
      onClick={() => openGlobalSearch(sidebarSearch)}
    >
      <SearchInput
        value={sidebarSearch}
        onChange={(value) => {
          setSidebarSearch(value);
          openGlobalSearch(value);
        }}
        placeholder="Global suchen"
        hint="Ctrl K"
      />
    </div>
  </div>
) : (
  /* Collapsed: nur ChevronRight-Button, unverändert */
  <div className="mb-3 flex justify-center">
    <span
      className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-steel-300 to-white text-sm font-bold text-steel-700 shadow-steel-icon"
      title="Projekt Manager"
    >
      PM
    </span>
  </div>
)}
```

**Hinweis:** Stelle sicher, dass `ChevronLeft` weiterhin importiert ist (`ChevronRight` wird im collapsed-State verwendet). `ChevronRight` aus dem collapsed-Toggle-Button bleibt unverändert.

---

## Schritt 5 – Listenansichten auf `PageHero` umstellen

Ersetze in jeder Listenseite:

```tsx
// Vorher:
import { PageHeader } from "../components/ui/PageHeader";
// …
<PageHeader title="Meilensteine" subtitle="…" actions={…} onRefresh={…} />
```

```tsx
// Nachher:
import { PageHero } from "../components/ui/PageHero";
// …
<PageHero
  variant="list"
  title="Meilensteine"
  subtitle="…"
  actions={
    <>
      {/* Bisherige Action-Buttons hier einfügen */}
      <Button … />
    </>
  }
/>
```

Das umgebende `<div className="flex flex-col gap-4 md:gap-6">` der Seite ändert sich: `gap` bleibt, aber der erste Eintrag ist nun `PageHero` ohne zusätzliches `px-`/`py-`-Padding (das Hero rendert selbst mit `px-5 md:px-6`). Der Folgeinhalt (FilterBar, Board/Liste) bekommt `px-4 md:px-5 pt-4` direkt.

**Betroffene Seiten und ihre bisherigen `PageHeader`-Props:**

| Seite | title | subtitle | actions |
|-------|-------|----------|---------|
| `MilestonesPage` | "Meilensteine" | `${milestones.milestones.length} Einträge` | "+ Neu"-Button |
| `ProjectsPage` | "Projekte" | Anzahl Projekte | "+ Neu"-Button |
| `TasksPage` | "Aufgaben" | Anzahl Aufgaben | "+ Neu"-Button |
| `TicketsPage` | "Tickets" | Anzahl Tickets | "+ Neu"-Button |
| `FeaturesPage` | "Features" | Anzahl Features | ggf. Import-Button |
| `WikiPage` | "Wiki" | – | ggf. Aktionen |
| `CalendarPage` | "Kalender" | – | – |
| `JournalPage` | "Journal" | – | – |
| `SettingsBackupPage` | "Datensicherung" | – | Aktionen |
| `SettingsPreferencesPage` | "Präferenzen" | `${settings.length} Einstellungen` | – |
| `admin/RolesPage` | "Rollen" | – | – |
| `admin/UsersPage` | "Benutzer" | – | "+ Neu"-Button |

`PageHeader` (`PageHeader.tsx`) kann nach der Migration gelöscht werden, sofern keine anderen Verweise mehr existieren. Prüfe mit:

```bash
grep -r "PageHeader" apps/web/src --include="*.tsx" -l
```

---

## Schritt 6 – FilterBar-Positioning auf Listenseiten

Die `ProjectMilestoneFilterBar` bleibt auf weißem Hintergrund **unterhalb** des Hero. Aktuell wird sie in den `PageHeader`-`actions`- oder `subtitle`-Bereich eingebettet. Nach der Migration rendert sie direkt als eigenes Element mit `px-4 md:px-5 py-3 border-b border-line bg-white`:

```tsx
{/* Filterzeile – unterhalb des Hero, eigene weiße Zeile */}
<div className="shrink-0 border-b border-line bg-white px-4 py-3 md:px-5">
  <ProjectMilestoneFilterBar … />
</div>
```

---

## Schritt 7 – Verifikation

Prüfe nach der Umsetzung:

1. **Visuelle Flucht:** Im Browser bei 100 % Zoom: die Unterkante des Sidebar-Kopfs (Unterkante Suchfeld / border-b) liegt auf exakt derselben vertikalen Position wie die Unterkante des `PageHero` im Content-Bereich. Gilt für Listenansichten **und** Detailansichten.
2. **Collapsed Sidebar:** Der collapsed State bleibt funktional (ChevronRight-Toggle, Icon-Only-Nav).
3. **Responsive:** Auf `md`-Breakpoint keine Überlappungen.
4. **Farbkonsistenz:** `from-steel-700 to-steel-600` sowohl in Sidebar als auch in `PageHero` (nicht `from-steel-700 to-steel-800` – der Sidebar-Gradient war `to-steel-800`, bitte angleichen).
5. **Modal-Variante:** `DetailModal` mit `variant="modal"` (nicht `"page"`) rendert weiterhin korrekt im `<Modal>`-Container.
6. **TypeScript:** `tsc --noEmit` ohne neue Fehler.

---

## Nicht im Scope

- Neugestaltung der `TabBar`-Komponente
- Mobile `TopBar` (separate Story)
- Collapsed-State des PM-Icon-Blocks (bleibt wie bisher, nur der expanded State wird überarbeitet)
- Dashboard-Seite (hat eigenes Layout, kein `PageHeader`)
