# Codex-Auftrag: DashboardPicker — Toggle-Zeile mit Kollaps

**Datum:** 2026-05-28
**Projekt:** PROJ-3 (Projekt Manager App)
**Meilenstein:** Persönliche Planung (Umbau)

---

## Ziel

Den `DashboardPicker` um eine kollabierbare Toggle-Zeile erweitern, die alle gespeicherten Dashboards des aktuellen Kontexts als Schaltflächen darstellt. Gleichzeitig wird das gesamte Builder-Control-Panel aus dem versteckten „Anpassen"-Bereich als eigenständiges Widget-Card an den Anfang des Übersicht-Inhalts gezogen.

Das Ergebnis ist ein zwei-zeiliges Dashboard-Steuerlement:

```
┌─────────────────────────────────────────────────────────────┐
│  [⊞] Dashboard      [Aktive Ansicht ▾] [Bearbeiten] [Ansichten ∧] │
│  [★ Mein Überblick] [Woche] [Fokus]  [+ Neue Ansicht]       │  ← kollabierbar
└─────────────────────────────────────────────────────────────┘
```

---

## Kontext

### Bestehende Komponenten (Referenz)

- `apps/web/src/components/dashboard/DashboardPicker.tsx` — aktuell: reines `<Select>`-Dropdown
- `apps/web/src/components/dashboard/DashboardView.tsx` — Builder-Panel aktuell hinter „Anpassen"-Button versteckt
- `apps/web/src/components/ui/SegmentedControl.tsx` — bereits vorhandener Toggle-Button-Stil (Vorlage für die Toggle-Buttons)

### Designvorgabe (aus Mockup)

- **Zeile 1 (immer sichtbar):** Dashboard-Icon + Label „Dashboard" + `<Select>`-Dropdown für aktive Ansicht + „Bearbeiten"-Button + Collapse-Button „Ansichten ∧/∨"
- **Zeile 2 (kollabierbar, Standard: ausgeklappt):** Ein Toggle-Button pro Dashboard (aktives Dashboard hervorgehoben) + gestrichelter „+ Neue Ansicht"-Button
- Das gesamte Steuerelement ist eine eigenständige Card (weißer Hintergrund, Border, border-radius-lg) — kein verstecktes Panel

---

## Aufgaben

### 1. `apps/web/src/components/dashboard/DashboardPicker.tsx`

Vollständiger Umbau der Komponente:

```tsx
interface DashboardPickerProps {
  dashboards: Dashboard[];
  selectedDashboardId: number | null;
  onChange: (dashboardId: number) => void;
  onEdit: () => void;
  onCreate: () => void;
}
```

- **Select-Zeile:** bestehendes `<Select>` bleibt erhalten (für Accessibility und viele Dashboards), ergänzt um `onEdit`-Button (`<Button variant="secondary" icon={<Pencil />}>Bearbeiten</Button>`) und Collapse-Button rechts
- **Toggle-Zeile (kollabierbar):**
  - Ein Button pro Dashboard, analog zum Stil von `SegmentedControl` — aber als eigenständige `<button>`-Elemente (kein SegmentedControl-Wrapper, da wir `isUserDefault`/`isGlobalDefault` mit ★-Icon markieren wollen)
  - Aktives Dashboard: `background: var(--color-steel-700)` / `color: white`
  - Standard-Dashboard: ★-Icon vor dem Label
  - Letzter Button: gestrichelte Border, „+ Neue Ansicht", ruft `onCreate` auf
- Collapse-Zustand in `localStorage` unter Key `"dashboardPickerTogglesOpen"` persistieren (Standard: `true`)

### 2. `apps/web/src/components/dashboard/DashboardView.tsx`

- Den bisherigen „Anpassen"-Button-Block und das inline Edit-Panel **entfernen**
- Stattdessen den `DashboardPicker` direkt und dauerhaft als erste Section im `content`-Bereich rendern — als Card-Wrapper:

```tsx
<div className="rounded-lg border border-line bg-white p-4 shadow-sm">
  <DashboardPicker
    dashboards={dashboards.dashboards}
    selectedDashboardId={selectedDashboard?.id ?? null}
    onChange={setSelectedDashboardId}
    onEdit={() => openBuilder(selectedDashboard)}
    onCreate={() => openBuilder(null)}
  />
</div>
```

- Der `DashboardBuilder` (Modal) bleibt unverändert — er wird weiterhin über `builderOpen` gesteuert
- `canWrite`-Guard bleibt: wenn kein Schreibrecht, wird der Picker read-only gerendert (kein Bearbeiten-Button, kein Neue-Ansicht-Button)

### 3. Sichtbarkeit: nur auf Übersicht-Tab

Der `DashboardView` mit dem Picker soll in der neuen `DayPlanPage` nur auf dem Übersicht-Tab gerendert werden. Das ist keine Änderung an `DashboardView` selbst, sondern an der Page-Struktur in `DayPlanPage.tsx` (siehe TASK-118): `<DashboardView>` wird nur gerendert wenn `activeTab === "overview"`.

Für alle anderen Kontexte (Projekt, Meilenstein, Kalender etc.) bleibt `DashboardView` wie bisher immer sichtbar — dort gibt es keine Tab-Struktur die ihn verbirgt.

---

## Akzeptanzkriterien

- `tsc` läuft ohne Fehler durch
- Toggle-Zeile klappt per Button ein und aus; Zustand überlebt einen Page-Reload
- Klick auf einen Toggle wechselt das aktive Dashboard sofort (kein Reload)
- ★ erscheint beim Standard-Dashboard
- „+ Neue Ansicht" öffnet den DashboardBuilder im Anlegen-Modus
- „Bearbeiten" öffnet den DashboardBuilder im Bearbeiten-Modus für das aktive Dashboard
- Ohne `dashboards.write`-Permission: nur Select sichtbar, keine Edit/Neu-Buttons
- Kein „Anpassen"-Button mehr in `DashboardView`
- Alle bestehenden Dashboard-Tests bleiben grün
