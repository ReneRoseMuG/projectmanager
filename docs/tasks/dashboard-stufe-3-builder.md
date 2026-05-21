# Codex-Aufgabe: Dashboard Stufe 3 — Freier Dashboard-Builder

## Zusammenfassung

Stufe 3 löst die verbleibende Einschränkung aus Stufe 2 auf: Die fest vorgegebenen
Dashboard-Kontexte (Global, Projekt, Meilenstein, Aufgabe) werden durch frei
definierbare, benannte Dashboards ergänzt. Ein visueller Builder erlaubt das freie
Platzieren von Widgets in einem Grid per Drag & Drop, das Anlegen mehrerer Dashboards
pro Kontext sowie die Auswahl, welches Dashboard als Standard angezeigt wird.
Dashboards werden nicht mehr im flachen Settings-System, sondern in eigenen
Datenbank-Tabellen persistiert, was Versionierung, Sharing und Admin-Vorlagen
ermöglicht. Stufe 2 ist vollständige Voraussetzung.

---

## Aufgabenbeschreibung

Auf Basis der Widget-Registry und des Setting-Systems aus Stufe 2 wird ein
vollständiger Dashboard-Builder eingeführt. Anwender können mehrere benannte
Dashboards pro Kontext anlegen, Widgets per Drag & Drop im Grid positionieren
und die Breite einzelner Widgets steuern (halb / ganz). Ein Admin kann
System-Dashboards anlegen, die für alle Nutzer als Vorlage sichtbar sind.

**Voraussetzung:** Stufe 2 ist vollständig implementiert und alle Tests sind grün.

---

## Scope

**Backend:**
- `apps/api/src/db/schema.ts` — neue Tabellen `dashboards`, `dashboard_widgets`
- Migration via `drizzle-kit generate`
- `apps/api/src/repositories/dashboard.repository.ts` — neu
- `apps/api/src/services/dashboard.service.ts` — neu
- `apps/api/src/routes/dashboard.ts` — neu (vollständige CRUD-REST-API)
- `apps/api/src/app.ts` — neue Route registrieren

**Shared Types:**
- `packages/shared-types/src/index.ts` — neue Typen für Dashboard-Entitäten

**Frontend:**
- `apps/web/src/api/dashboard.ts` — Dashboard-API-Client erweitern
- `apps/web/src/hooks/useDashboards.ts` — neuer Hook (CRUD für Dashboard-Entitäten)
- `apps/web/src/components/dashboard/useDashboardConfig.ts` — auf DB-Persistenz umstellen
- `apps/web/src/components/dashboard/DashboardGrid.tsx` — Grid-Positionierung ergänzen
- `apps/web/src/components/dashboard/DashboardBuilder.tsx` — neu (Drag-&-Drop-Editor)
- `apps/web/src/components/dashboard/DashboardPicker.tsx` — neu (Dashboard auswählen/anlegen)
- `apps/web/src/components/dashboard/DashboardWidgetWrapper.tsx` — neu (Resize-Handles)
- Alle vier Kompositionen (`ProjectDashboard` etc.) — Builder integrieren

---

## Schritt 1: Bestandsaufnahme

Lies zunächst den Architektur-Leitfaden vollständig: `docs/architecture-leitfaden.md`

Lies die Konzept- und Vorstufen-Dokumente:
- `docs/tasks/konzept-dashboards.md`
- `docs/tasks/dashboard-stufe-1-statisch.md`
- `docs/tasks/dashboard-stufe-2-konfigurierbar.md`

Lese dann alle betroffenen Dateien und erstelle eine Ist/Soll-Tabelle:

| Datei | Ist-Zustand | Soll-Zustand |
|---|---|---|
| `db/schema.ts` | Keine Dashboard-Tabellen | `dashboards`, `dashboard_widgets` ergänzt |
| `repositories/` | Kein Dashboard-Repository | `dashboard.repository.ts` neu |
| `services/` | Kein Dashboard-Service | `dashboard.service.ts` neu |
| `routes/dashboard.ts` | Nicht vorhanden | Vollständige CRUD-API neu |
| `shared-types/index.ts` | Widget-Config-Typen (Stufe 2) | Dashboard-Entitäts-Typen ergänzt |
| `useDashboardConfig.ts` | Liest aus Settings | Liest aus DB-Dashboard-Entität |
| `DashboardGrid.tsx` | Rendert aus Config-Liste | Rendert mit Grid-Positionierung |
| `DashboardBuilder.tsx` | Nicht vorhanden | Neu — Drag-&-Drop-Editor |
| `DashboardPicker.tsx` | Nicht vorhanden | Neu — Dashboard-Auswahl und -Verwaltung |
| Alle Kompositionen | Konfigurator aus Stufe 2 | Builder + Picker integriert |

**Beginne mit der Implementierung erst nach abgeschlossener Bestandsaufnahme.**

---

## Schritt 2: Schema & Migration

### Neue Tabellen in `apps/api/src/db/schema.ts`

#### `dashboards`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | integer PK autoincrement | |
| `name` | text NOT NULL | Angezeigter Name |
| `context` | text NOT NULL | `global \| project \| milestone \| task` |
| `is_system` | integer NOT NULL DEFAULT 0 | 1 = Admin-Vorlage, schreibgeschützt für normale Nutzer |
| `is_default` | integer NOT NULL DEFAULT 0 | 1 = Standard-Dashboard für diesen Nutzer/Context |
| `owner_id` | integer NULL FK → users.id | NULL bei System-Dashboards |
| `version` | integer NOT NULL DEFAULT 1 | Optimistic Locking |
| `created_by` | integer FK → users.id | |
| `updated_by` | integer FK → users.id | |
| `created_at` | text NOT NULL | ISO 8601 |
| `updated_at` | text NOT NULL | ISO 8601 |

Index: `(context, owner_id)` für schnelles Laden aller Dashboards eines Nutzers
pro Kontext.

#### `dashboard_widgets`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | integer PK autoincrement | |
| `dashboard_id` | integer NOT NULL FK → dashboards.id CASCADE | |
| `widget_id` | text NOT NULL | Widget-ID aus Registry (z.B. `taskStatusReport`) |
| `col` | integer NOT NULL DEFAULT 0 | Spalte im Grid (0 oder 1) |
| `row` | integer NOT NULL DEFAULT 0 | Zeile im Grid |
| `col_span` | integer NOT NULL DEFAULT 2 | 1 = halbe Breite, 2 = volle Breite |
| `params` | text NULL | JSON-String mit Widget-Parametern (`{ limit: 10 }`) |

Index: `(dashboard_id)` — Widgets werden immer als Menge eines Dashboards geladen.
Unique: `(dashboard_id, widget_id)` — ein Widget-Typ pro Dashboard nur einmal.

**Migration:** Via `drizzle-kit generate` erzeugen. Keine Datenmigration nötig
(Settings aus Stufe 2 bleiben unverändert als Fallback für nicht migrierte
Dashboard-Konfigurationen, bis der Nutzer sein erstes Dashboard speichert).

---

## Schritt 3: Shared Types

In `packages/shared-types/src/index.ts` ergänzen:

```typescript
export type DashboardContext = "global" | "project" | "milestone" | "task";

export interface DashboardWidgetLayout {
  widgetId: DashboardWidgetId;
  col: 0 | 1;
  row: number;
  colSpan: 1 | 2;
  params?: { limit?: number };
}

export interface Dashboard {
  id: number;
  name: string;
  context: DashboardContext;
  isSystem: boolean;
  isDefault: boolean;
  ownerId: number | null;
  widgets: DashboardWidgetLayout[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardInput {
  name: string;
  context: DashboardContext;
  widgets: DashboardWidgetLayout[];
}

export interface DashboardUpdate extends DashboardInput {
  expectedVersion: number;
}
```

---

## Schritt 4: Repository

Neue Datei: `apps/api/src/repositories/dashboard.repository.ts`

Methoden gemäß Architektur-Leitfaden (Standard-CRUD mit Version-Prüfung):

- `findById(db, id)` → `Dashboard | null`
  Lädt Dashboard inkl. aller Widget-Einträge (JOIN auf `dashboard_widgets`)
- `findByContext(db, context, userId)` → `Dashboard[]`
  Alle Dashboards des Nutzers für einen Kontext plus alle System-Dashboards
  desselben Kontexts
- `create(db, input, userId)` → `Dashboard`
  Legt Dashboard und Widget-Einträge in einer Transaktion an
- `update(db, id, update, userId)` → `Dashboard`
  Prüft `expectedVersion`, löscht alte Widget-Einträge, legt neue an (Replace-Semantik),
  inkrementiert Version, setzt `updated_at`, `updated_by`
- `setDefault(db, id, context, userId)` → `void`
  Setzt `is_default = 0` für alle anderen Dashboards desselben Nutzers/Kontexts,
  dann `is_default = 1` für das angegebene Dashboard
- `delete(db, id, userId)` → `void`
  System-Dashboards dürfen nicht von normalen Nutzern gelöscht werden → Fehler werfen

---

## Schritt 5: Service

Neue Datei: `apps/api/src/services/dashboard.service.ts`

- `getDashboard(db, id, currentUser)` → lädt und prüft Leseberechtigung
- `listDashboardsByContext(db, context, currentUser)` → eigene + System-Dashboards
- `createDashboard(db, input, currentUser)` → validiert erlaubte Widget-IDs für Kontext,
  delegiert an Repository
- `updateDashboard(db, id, update, currentUser)` → prüft Schreibberechtigung
  (eigenes Dashboard oder Admin), delegiert
- `deleteDashboard(db, id, currentUser)` → prüft Berechtigung, System-Dashboards
  nur für Admins löschbar
- `setDefaultDashboard(db, id, currentUser)` → delegiert an Repository

**Validierung:** Widget-IDs werden gegen `ALLOWED_WIDGETS[context]` aus den
Shared Types geprüft. Unbekannte Widget-IDs → HTTP 422.

**Autorisierung:** Normale Nutzer dürfen nur eigene Dashboards schreiben/löschen.
System-Dashboards sind schreibgeschützt für alle außer Admins.

---

## Schritt 6: Routen

Neue Datei: `apps/api/src/routes/dashboard.ts`

```
GET  /dashboards?context=X          → listDashboardsByContext (eigene + System)
POST /dashboards                    → createDashboard (body: DashboardInput)

GET  /dashboards/:id                → getDashboard
PUT  /dashboards/:id                → updateDashboard (body: DashboardUpdate)
DELETE /dashboards/:id              → deleteDashboard → 204

POST /dashboards/:id/default        → setDefaultDashboard → 200
```

Alle Routen erfordern Authentifizierung.
Route in `apps/api/src/app.ts` registrieren.

---

## Schritt 7: Frontend — API-Client und Hook

### API-Client (`apps/web/src/api/dashboard.ts` erweitern)

```typescript
export async function listDashboards(context: DashboardContext): Promise<Dashboard[]>
export async function getDashboard(id: number): Promise<Dashboard>
export async function createDashboard(input: DashboardInput): Promise<Dashboard>
export async function updateDashboard(id: number, update: DashboardUpdate): Promise<Dashboard>
export async function deleteDashboard(id: number): Promise<void>
export async function setDefaultDashboard(id: number): Promise<void>
```

### Hook (`apps/web/src/hooks/useDashboards.ts`)

```typescript
interface UseDashboardsResult {
  dashboards: Dashboard[];          // Alle Dashboards für diesen Kontext
  activeDashboard: Dashboard | null; // Das Standard- oder zuletzt gewählte
  loading: boolean;
  createDashboard: (input: DashboardInput) => Promise<Dashboard>;
  updateDashboard: (id: number, update: DashboardUpdate) => Promise<Dashboard>;
  deleteDashboard: (id: number) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
  selectDashboard: (id: number) => void; // Lokale Auswahl ohne Persistenz
}

export function useDashboards(context: DashboardContext): UseDashboardsResult
```

Das `activeDashboard` ist initial das Dashboard mit `isDefault = true` des Nutzers.
Falls keines als Default markiert ist: das erste System-Dashboard oder das erste eigene.

---

## Schritt 8: `useDashboardConfig` umstellen

`apps/web/src/components/dashboard/useDashboardConfig.ts` aus Stufe 2 wird umgestellt:

- **Bisher (Stufe 2):** Liest Setting-Key, liefert flache Widget-Liste
- **Neu (Stufe 3):** Wraps `useDashboards`, liefert `activeWidgets` aus
  `activeDashboard.widgets` in Reihenfolge nach `row` + `col`

Der `DashboardConfigurator` aus Stufe 2 wird durch `DashboardBuilder` ersetzt.
Stufe-2-Settings bleiben als Fallback erhalten: Wenn kein DB-Dashboard vorhanden
(Erstnutzung), wird die Stufe-2-Config als Migrations-Default verwendet, bis der
Nutzer das erste Mal speichert.

---

## Schritt 9: `DashboardBuilder` — Drag-&-Drop-Editor

Neue Datei: `apps/web/src/components/dashboard/DashboardBuilder.tsx`

**Props:**
```typescript
interface DashboardBuilderProps {
  context: DashboardContext;
  dashboard: Dashboard | null;  // null = neues Dashboard anlegen
  owner: DashboardOwner | undefined;
  onSave: (input: DashboardInput | DashboardUpdate) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}
```

**UI-Aufbau:**

```
┌─────────────────────────────────────────────────┐
│  📌 Dashboard-Name: [__________________]        │
│                                                  │
│  Verfügbare Widgets          Vorschau / Canvas  │
│  ┌────────────────────┐     ┌─────────────────┐ │
│  │ ☑ Aufgaben-Status │     │  [Widget A] [B] │ │
│  │ ☑ Ticket-Status   │     │  [Widget C      ] │ │
│  │ ☐ Letzte Aufgaben │     │  [Widget D      ] │ │
│  │ ☐ Aktivitäts-Log  │     │                 │ │
│  └────────────────────┘     └─────────────────┘ │
│                                                  │
│  [Speichern]  [Als Standard]  [Löschen]  [✕]   │
└─────────────────────────────────────────────────┘
```

**Drag & Drop:**
- Widgets aus der linken Liste auf den Canvas ziehen (hinzufügen)
- Widgets auf dem Canvas zwischen Positionen verschieben
- Widget auf der linken Liste deaktivieren → aus Canvas entfernen
- Pro Widget auf dem Canvas: Handle für Breite umschalten (½ / ganz)

**Drag-&-Drop-Bibliothek:**
Die App verwendet bereits keine DnD-Bibliothek. `@dnd-kit/core` und
`@dnd-kit/sortable` verwenden — sie sind leichtgewichtig, accessibility-konform
und benötigen keine Peer-Dependencies. Installation via `npm install @dnd-kit/core @dnd-kit/sortable`.

**Grid-Logik:**
- 2-spaltiges Grid, jede Zeile hat maximal 2 Spalten (colSpan=1) oder 1 Widget über
  volle Breite (colSpan=2)
- Beim Drop wird automatisch die nächste freie Position berechnet
- Kompaktierung: beim Entfernen eines Widgets werden nachfolgende Widgets
  in der Zeile aufgerückt; leere Zeilen werden entfernt

**Live-Vorschau:**
Der Canvas zeigt keine echten Daten — stattdessen Placeholder-Boxen mit dem
Widget-Label und Icon aus der Registry. Erst nach Speichern wird das echte
Dashboard gerendert.

**Speichern:**
- Name muss ausgefüllt sein (min. 1 Zeichen)
- Mindestens 1 Widget muss auf dem Canvas liegen
- Bei Update: `expectedVersion` mitschicken (Optimistic Locking)

---

## Schritt 10: `DashboardPicker`

Neue Datei: `apps/web/src/components/dashboard/DashboardPicker.tsx`

**Props:**
```typescript
interface DashboardPickerProps {
  context: DashboardContext;
  dashboards: Dashboard[];
  activeDashboardId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;           // Öffnet Builder im Anlegen-Modus
  onEdit: (id: number) => void; // Öffnet Builder im Bearbeiten-Modus
}
```

**UI:** Kleines Dropdown oder Tabs über dem Dashboard-Grid:

```
[ Mein Dashboard ▾ ]  [+]  [✏]
  ├─ Mein Dashboard   ← aktiv
  ├─ Sprint-Ansicht
  └─ 📌 Standard-Vorlage  (System)
```

- Eigene Dashboards: umbenennen, löschen, als Standard markieren
- System-Dashboards: nur lesen, als eigene Kopie duplizieren
- `[+]` → Builder im Anlegen-Modus
- `[✏]` → Builder für aktives Dashboard (nur wenn eigenes)

---

## Schritt 11: Kompositionen anpassen

Alle vier Kompositionen (`ProjectDashboard`, `MilestoneDashboard`, `TaskDashboard`,
`GlobalDashboard`) werden erweitert:

```typescript
export function ProjectDashboard({ projectId }: { projectId: number }) {
  const owner: DashboardOwner = { type: "project", id: projectId };
  const { dashboards, activeDashboard, createDashboard, updateDashboard,
          deleteDashboard, setDefault, selectDashboard } = useDashboards("project");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);

  return (
    <div>
      <DashboardPicker
        context="project"
        dashboards={dashboards}
        activeDashboardId={activeDashboard?.id ?? null}
        onSelect={selectDashboard}
        onNew={() => { setEditingDashboard(null); setBuilderOpen(true); }}
        onEdit={(id) => {
          setEditingDashboard(dashboards.find(d => d.id === id) ?? null);
          setBuilderOpen(true);
        }}
      />
      {activeDashboard && (
        <DashboardGrid
          widgets={activeDashboard.widgets}
          owner={owner}
          context="project"
        />
      )}
      {builderOpen && (
        <DashboardBuilder
          context="project"
          dashboard={editingDashboard}
          owner={owner}
          onSave={async (input) => {
            if (editingDashboard) {
              await updateDashboard(editingDashboard.id, input as DashboardUpdate);
            } else {
              await createDashboard(input as DashboardInput);
            }
            setBuilderOpen(false);
          }}
          onDelete={editingDashboard ? async () => {
            await deleteDashboard(editingDashboard.id);
            setBuilderOpen(false);
          } : undefined}
          onClose={() => setBuilderOpen(false)}
        />
      )}
    </div>
  );
}
```

---

## Schritt 12: `DashboardGrid` für Positionen erweitern

`DashboardGrid` aus Stufe 2 wird um Grid-Positionierung erweitert:

**Props ändern:**
```typescript
interface DashboardGridProps {
  widgets: DashboardWidgetLayout[];   // Nicht mehr DashboardWidgetEntry[], sondern mit col/row/colSpan
  owner: DashboardOwner | undefined;
  context: DashboardContext;
}
```

Layout: CSS-Grid mit `grid-template-columns: repeat(2, 1fr)`.
Ein Widget mit `colSpan=2` bekommt `grid-column: span 2`.
Die Reihenfolge der Widgets ergibt sich aus `row` (primär) + `col` (sekundär).

---

## Schritt 13: Tests

### 13a — Integration-Tests

Neue Testdatei: `apps/api/tests/integration/dashboard.test.ts`

**CRUD:**
- Dashboard anlegen → in Liste sichtbar, Widgets korrekt gespeichert
- Dashboard lesen per ID → korrektes Objekt zurück
- Dashboard updaten mit korrekter Version → Version inkrementiert
- Dashboard löschen → nicht mehr abrufbar
- System-Dashboard löschen als normaler Nutzer → HTTP 403
- Dashboard mit ungültiger Widget-ID → HTTP 422
- Zwei Nutzer haben unabhängige Dashboard-Listen

**Optimistic Locking:**
- Update mit korrekter Version → HTTP 200, neue Version in Response
- Update mit veralteter Version → HTTP 409

**Standard-Dashboard:**
- `setDefault` auf Dashboard B → Dashboard A desselben Kontexts hat `isDefault = false`
- Nutzer A setzt Default → Nutzer B unberührt

**Kaskaden:**
- Dashboard löschen → `dashboard_widgets`-Einträge automatisch entfernt

Kaskaden-Szenarien zusätzlich in `apps/api/tests/integration/delete-cascade.test.ts`.

### 13b — E2E-Tests (Playwright)

Ergänzung in `apps/web/e2e/dashboard.spec.ts`:

- `[+]`-Button öffnet Builder
- Widget auf Canvas ziehen → erscheint in Vorschau
- Widget-Breite umschalten (½ / ganz)
- Speichern → Dashboard in Picker sichtbar, Widgets werden gerendert
- Dashboard als Standard markieren → nach Reload zuerst angezeigt
- System-Dashboard: `[✏]`-Button ist deaktiviert
- System-Dashboard duplizieren → eigene Kopie erscheint im Picker
- Dashboard löschen → verschwindet aus Picker, Standard-Dashboard wird aktiviert

---

## Abnahmekriterien

- [ ] Schema-Tabellen `dashboards` und `dashboard_widgets` gemäß Leitfaden
  (alle Pflichtfelder: `version`, `created_by`, `updated_by`, `created_at`, `updated_at`)
- [ ] `dashboard.repository.ts` mit Standard-CRUD und Optimistic Locking
- [ ] Kein Service greift direkt auf Drizzle zu
- [ ] Widget-IDs werden beim Speichern gegen `ALLOWED_WIDGETS[context]` validiert → HTTP 422
- [ ] System-Dashboards sind für normale Nutzer schreibgeschützt → HTTP 403
- [ ] Stufe-2-Setting als Fallback aktiv solange kein DB-Dashboard vorhanden
- [ ] `DashboardBuilder` öffnet sich, Drag & Drop funktioniert, Vorschau aktualisiert sich
- [ ] `DashboardPicker` zeigt eigene + System-Dashboards, Standard-Markierung funktioniert
- [ ] Alle CRUD-Integration-Tests grün (inkl. Optimistic Locking + Kaskaden)
- [ ] `delete-cascade.test.ts` um Dashboard-Kaskade ergänzt und grün
- [ ] Alle E2E-Tests grün
- [ ] Alle Tests aus Stufe 1 und 2 weiterhin grün
- [ ] `@dnd-kit`-Abhängigkeiten in `package.json` eingetragen

---

## Referenz

- Konzept: `docs/tasks/konzept-dashboards.md`
- Stufe-1-Aufgabe: `docs/tasks/dashboard-stufe-1-statisch.md`
- Stufe-2-Aufgabe: `docs/tasks/dashboard-stufe-2-konfigurierbar.md`
- Architektur-Leitfaden: `docs/architecture-leitfaden.md`
- Schema: `apps/api/src/db/schema.ts`
- Repositories: `apps/api/src/repositories/`
- Services: `apps/api/src/services/`
- Integration-Tests: `apps/api/tests/integration/`
- E2E-Tests: `apps/web/e2e/`
