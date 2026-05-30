# Codex-Auftrag: Route `/dashboard` und DashboardPage entfernen

## Kontext

Die Route `/dashboard` mit der Komponente `DashboardPage` (Kontext `global`) ist redundant geworden, da die Startseite (`/`) nun ein vollständig konfigurierbares Dashboard darstellt. Die globale Dashboard-Ansicht kann bei Bedarf auf der Startseite oder über Projekt-/Meilenstein-Kontexte abgerufen werden.

## Betroffene Dateien

### 1. `apps/web/src/pages/DashboardPage.tsx` — löschen

Die Datei wird vollständig entfernt.

### 2. `apps/web/src/App.tsx` — Route entfernen

Die Route `"/dashboard"` aus dem Router entfernen:

```tsx
// Diese Zeile entfernen:
{ path: "/dashboard", element: <DashboardPage /> }
```

Auch den Import von `DashboardPage` entfernen:
```tsx
// import { DashboardPage } from "./pages/DashboardPage"; // entfernen
```

### 3. `apps/web/src/components/layout/Sidebar.tsx` — Navigationseintrag entfernen

Den Sidebar-Eintrag für `/dashboard` entfernen:

```tsx
// Diesen Eintrag entfernen:
{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
```

Falls `LayoutDashboard` aus `lucide-react` danach nicht mehr verwendet wird, auch den Import entfernen.

## Abnahmekriterien

- `GET /dashboard` liefert einen 404 oder leitet auf `/` um (je nach Router-Konfiguration).
- Die Sidebar zeigt keinen „Dashboard"-Navigationseintrag mehr.
- Keine TypeScript-Fehler durch entfernte Importe.
- Bestehende Tests für `/dashboard` müssen angepasst oder entfernt werden.
- Bestehende Tests für die Startseite (`/`) sind nicht betroffen.
