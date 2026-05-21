# Codex-Aufgabe: Dashboard Stufe 2 — Konfigurierbare Widget-Auswahl

## Zusammenfassung

Stufe 2 macht die in Stufe 1 hardcodierten Dashboard-Kompositionen individuell
anpassbar. Jeder Anwender kann pro Dashboard-Kontext (Global, Projekt, Meilenstein,
Aufgabe) selbst festlegen, welche Widgets angezeigt werden und in welcher Reihenfolge
sie erscheinen. Die Konfiguration wird über das bereits bestehende Settings-System
persistiert — mit `USER`-Scope für individuelle Präferenzen und `GLOBAL`-Scope für
organisationsweite Defaults, die ein Administrator vorgibt. Ein schlankes
Konfigurations-Panel mit Checkboxen und Umsortierung ersetzt die bisherigen festen
Kompositionen. Stufe 1 ist vollständige Voraussetzung.

---

## Aufgabenbeschreibung

Die statischen Dashboard-Kompositionen aus Stufe 1 werden durch eine
konfigurationsgetriebene Rendering-Engine ersetzt. Die erlaubten Widgets pro
Dashboard-Kontext bleiben technisch vorgegeben (Scope-Matrix), aber Sichtbarkeit
und Reihenfolge bestimmt der Anwender.

**Voraussetzung:** Stufe 1 ist vollständig implementiert und alle Tests sind grün.

---

## Scope

**Shared Types:**
- `packages/shared-types/src/index.ts` — neue Setting-Keys und Widget-Config-Typen

**Backend:** keine Änderungen — Settings-Endpunkt existiert bereits

**Frontend:**
- `apps/web/src/components/dashboard/DashboardGrid.tsx` — config-getrieben umbauen
- `apps/web/src/components/dashboard/DashboardConfigurator.tsx` — neu
- `apps/web/src/components/dashboard/useDashboardConfig.ts` — neu
- `apps/web/src/components/dashboard/widgetRegistry.ts` — neu
- Alle vier Kompositions-Komponenten — auf Config umstellen

---

## Schritt 1: Bestandsaufnahme

Lies den Architektur-Leitfaden: `docs/architecture-leitfaden.md`
Lies das Konzept: `docs/tasks/konzept-dashboards.md`

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `shared-types/index.ts` | Dashboard-Typen aus Stufe 1 | Setting-Keys + Widget-Config-Typen ergänzt |
| `DashboardGrid.tsx` | Rendert `children` statisch | Rendert aus Config-Liste |
| Alle Kompositionen | Hardcodiert | Config-getrieben + Konfigurations-Panel |
| `DashboardConfigurator.tsx` | Nicht vorhanden | Neu |
| `useDashboardConfig.ts` | Nicht vorhanden | Neu |
| `widgetRegistry.ts` | Nicht vorhanden | Neu |

---

## Schritt 2: Shared Types

### 2a — Widget-IDs und Config-Typen

```typescript
export const DASHBOARD_WIDGET_IDS = [
  "taskStatusReport",
  "ticketStatusReport",
  "taskJournal",
  "ticketJournal",
  "globalJournal",
  "commentJournal",
  "attachmentJournal",
  "milestoneProgress",   // Phase 2
  "overdueTask"          // Phase 2
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];
export type DashboardContextKey = "global" | "project" | "milestone" | "task";

export interface DashboardWidgetEntry {
  id: DashboardWidgetId;
  enabled: boolean;
  params?: { limit?: number };
}

export type DashboardConfig = DashboardWidgetEntry[];
```

### 2b — Setting-Keys

Vier neue Keys im `settingsRegistry`. `defaultValue` entspricht der Stufe-1-Komposition:

```typescript
"dashboard.global.widgets": {
  defaultValue: [
    { id: "taskStatusReport",   enabled: true },
    { id: "ticketStatusReport", enabled: true },
    { id: "globalJournal",      enabled: true },
    { id: "taskJournal",        enabled: true },
    { id: "ticketJournal",      enabled: true },
    { id: "commentJournal",     enabled: true },
    { id: "attachmentJournal",  enabled: true }
  ],
  allowedScopes: ["GLOBAL", "USER"], ...
},

"dashboard.project.widgets": {
  defaultValue: [
    { id: "taskStatusReport",   enabled: true },
    { id: "ticketStatusReport", enabled: true },
    { id: "taskJournal",        enabled: true },
    { id: "ticketJournal",      enabled: true },
    { id: "commentJournal",     enabled: true },
    { id: "attachmentJournal",  enabled: true },
    { id: "globalJournal",      enabled: true }
  ],
  allowedScopes: ["GLOBAL", "USER"], ...
},

"dashboard.milestone.widgets": {
  defaultValue: [
    { id: "taskStatusReport",   enabled: true },
    { id: "ticketStatusReport", enabled: true },
    { id: "taskJournal",        enabled: true },
    { id: "commentJournal",     enabled: true },
    { id: "attachmentJournal",  enabled: true }
  ],
  allowedScopes: ["GLOBAL", "USER"], ...
},

"dashboard.task.widgets": {
  defaultValue: [
    { id: "taskStatusReport",   enabled: true },
    { id: "taskJournal",        enabled: true },
    { id: "commentJournal",     enabled: true },
    { id: "attachmentJournal",  enabled: true }
  ],
  allowedScopes: ["GLOBAL", "USER"], ...
}
```

---

## Schritt 3: Widget-Registry

```typescript
export const ALLOWED_WIDGETS: Record<DashboardContextKey, DashboardWidgetId[]> = {
  global:    ["taskStatusReport", "ticketStatusReport", "globalJournal",
              "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal"],
  project:   ["taskStatusReport", "ticketStatusReport", "globalJournal",
              "taskJournal", "ticketJournal", "commentJournal", "attachmentJournal"],
  milestone: ["taskStatusReport", "ticketStatusReport",
              "taskJournal", "commentJournal", "attachmentJournal"],
  task:      ["taskStatusReport", "taskJournal", "commentJournal", "attachmentJournal"]
};

export const WIDGET_DEFINITIONS: Record<DashboardWidgetId, WidgetDefinition> = {
  taskStatusReport:   { label: "Aufgaben nach Status",     icon: <ListTodo />,       ... },
  ticketStatusReport: { label: "Tickets nach Status",      icon: <Inbox />,          ... },
  taskJournal:        { label: "Letzte Aufgaben",          icon: <Activity />,       ... },
  ticketJournal:      { label: "Letzte Tickets",           icon: <Bug />,            ... },
  globalJournal:      { label: "Aktivitäts-Journal",       icon: <GitCommit />,      ... },
  commentJournal:     { label: "Letzte Kommentare",        icon: <MessageSquare />,  ... },
  attachmentJournal:  { label: "Letzte Anhänge",           icon: <Paperclip />,      ... },
  milestoneProgress:  { label: "Meilenstein-Fortschritt",  icon: <Flag />,           ... },
  overdueTask:        { label: "Überfällige Aufgaben",     icon: <CalendarClock />,  ... }
};
```

Phase-2-Widgets (`milestoneProgress`, `overdueTask`) in `WIDGET_DEFINITIONS`
deklariert, aber **nicht** in `ALLOWED_WIDGETS` — erscheinen nicht im Konfigurator.

---

## Schritt 4: `useDashboardConfig`

```typescript
export function useDashboardConfig(context: DashboardContextKey): {
  activeWidgets: DashboardWidgetEntry[];
  fullConfig: DashboardConfig;
  saveConfig: (config: DashboardConfig) => Promise<void>;
  loading: boolean;
}
```

- Liest `dashboard.{context}.widgets` via `useSettings`
- `activeWidgets` = `enabled: true`, gefiltert auf `ALLOWED_WIDGETS[context]`
- Fehlende Widget-IDs aus `ALLOWED_WIDGETS[context]` am Ende mit `enabled: false` ergänzen
- `saveConfig` → Settings-PUT `scopeType: "USER"`, Fehler → Toast

---

## Schritt 5: `DashboardConfigurator`

- Öffnet per „Dashboard anpassen"-Button (`Settings2`) im Dashboard-Header
- Liste aller `ALLOWED_WIDGETS[context]`-Einträge
- Pro Widget: Checkbox + Icon + Label
- `limit`-Zahlenfeld bei `enabled` für Journal-Widgets:
  `taskJournal`, `ticketJournal`, `globalJournal`, `commentJournal`, `attachmentJournal`
  (min: 5, max: 50)
- ▲/▼ zum Umsortieren enabled Widgets
- „Speichern", „Zurücksetzen" (löscht USER-Setting), „Abbrechen"

---

## Schritt 6: `DashboardGrid` umbauen

```typescript
interface DashboardGridProps {
  widgets: DashboardWidgetEntry[];
  owner: DashboardOwner | undefined;
  context: DashboardContextKey;
}
```

`WIDGET_DEFINITIONS[entry.id].render(owner, entry.params ?? {})` pro Widget.
`taskStatusReport` + `ticketStatusReport` nebeneinander wenn beide aktiv und
aufeinanderfolgend. Alle anderen volle Breite.

---

## Schritt 7: Kompositionen

```typescript
export function ProjectDashboard({ projectId }: { projectId: number }) {
  const { activeWidgets, fullConfig, saveConfig } = useDashboardConfig("project");
  const [configuratorOpen, setConfiguratorOpen] = useState(false);
  const owner: DashboardOwner = { type: "project", id: projectId };
  return (
    <div>
      <DashboardHeader onConfigure={() => setConfiguratorOpen(true)} />
      <DashboardGrid widgets={activeWidgets} owner={owner} context="project" />
      {configuratorOpen && (
        <DashboardConfigurator context="project" config={fullConfig}
          onSave={saveConfig} onClose={() => setConfiguratorOpen(false)} />
      )}
    </div>
  );
}
```

Analog für alle vier Kompositionen.

---

## Schritt 8: Tests

### Unit-Tests (`useDashboardConfig.test.ts`)
- `activeWidgets` nur `enabled: true`, in Reihenfolge
- Unbekannte IDs gefiltert
- Fehlende IDs aus `ALLOWED_WIDGETS` mit `enabled: false` ergänzt
- `commentJournal` und `attachmentJournal` in `fullConfig` aller Kontexte
- `saveConfig` korrekt

### E2E-Tests
- `commentJournal` und `attachmentJournal` im Konfigurator sichtbar
- Ein-/Ausschalten, Reihenfolge, Reload, Zurücksetzen

---

## Abnahmekriterien

- [ ] `commentJournal` und `attachmentJournal` in `DASHBOARD_WIDGET_IDS`
- [ ] Beide in allen vier `ALLOWED_WIDGETS`-Kontexten
- [ ] Default-Configs aller Setting-Keys enthalten beide Widgets
- [ ] `limit`-Feld im Konfigurator für `attachmentJournal`
- [ ] `DashboardGrid` rendert ausschließlich aus Config-Liste
- [ ] „Zurücksetzen" stellt Default inkl. beider Widgets her
- [ ] Phase-2-Widgets in Registry, aber nicht in `ALLOWED_WIDGETS`
- [ ] Alle Stufe-1-Tests grün
- [ ] Unit- und E2E-Tests grün

---

## Referenz

- Konzept: `docs/tasks/konzept-dashboards.md`
- Stufe-1-Aufgabe: `docs/tasks/dashboard-stufe-1-statisch.md`
- Settings: `packages/shared-types/src/index.ts`, `apps/web/src/hooks/useSettings.ts`
- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
