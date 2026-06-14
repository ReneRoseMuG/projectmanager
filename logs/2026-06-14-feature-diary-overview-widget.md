# Schritt-Log: Startseiten-Tagebuch-Widget (diaryOverview)

**Auftrag:** Erweiterung des Tagebuch-Features (MS-70) um ein Widget für das **Startseiten-Dashboard**
(`home`-Kontext) mit Projekt-Umschalter „Alle Projekte / einzelnes Projekt". Auftragsklasse 5.
Vorgehen: direkt umsetzen (vom Nutzer gewählt), mit Tests und Schritt-Log.

## Umgesetzt

### Backend (`apps/api`)
- `diary-entry.repository.ts`: `findAll(db)` (alle Einträge).
- `diary.service.ts`: `listAllDiaries(db)` → `DiaryEntry[]` (projektübergreifend; Projektname-Auflösung
  erfolgt im Frontend über die Projektliste).
- `routes/diary.ts`: neue Route `GET /diary` (read-gegated über `config.auth` → `diary:read`).

### Shared Types
- `diaryOverview` zu `DASHBOARD_WIDGET_IDS` und zur `home`-Liste in `DASHBOARD_ALLOWED_WIDGETS`
  (nur Startseiten-Kontext; bewusst nicht ins Default-Layout).

### Frontend (`apps/web`)
- `api/diary.ts`: `getAllDiaries()` (GET /diary).
- `hooks/useDiary.ts`: `useAllDiaries(enabled)`.
- `queries/queryKeys.ts`: neuer `diary.all`-Key.
- `widgetRegistry.tsx`: Eintrag `diaryOverview` (Label „Tagebücher", Icon Library).
- `DashboardWidgets.tsx`: Komponente `DiaryOverviewWidget` — Selektor im Kopf (Dropdown „Alle Projekte"
  + Einzelprojekte, Auswahl pro Nutzer in localStorage). „Alle": gestapelte Tagebücher je mit
  Projekt-Überschrift; „Einzel": ein Tagebuch wie `projectDiary`. HTML read-only über `RichTextInlineField`,
  EmptyState, „Aktualisieren"=Refetch, Gating über `diary:read`. Render-Fall + `usesOwnData` ergänzt.

## Tests
- Testleitplanken angewendet (`test-entwurfsleitplanken`).
- API-Integration (`diary.test.ts`, 13 Tests grün): u. a. `GET /diary` liefert alle Tagebücher
  projektübergreifend (datengetrieben mit Gegenbeispiel: Projekt ohne Eintrag erscheint nicht),
  leere Liste ohne Einträge, 401 ohne Session.
- Frontend (`useDiary.test.tsx` +2, `DashboardWidgets.test.tsx` +4, grün): `useAllDiaries` lädt/Fehler;
  DiaryOverviewWidget zeigt gestapelte Tagebücher mit Projektnamen, schaltet auf Einzelprojekt um,
  EmptyState ohne Einträge, kein Inhalt/Selektor ohne `diary:read`.
- api/web bauen sauber.

## Offene Punkte / Blocker
- **Vorbestehender roter Test (nicht aus diesem Auftrag):** `DashboardWidgets.test.tsx › „filtert das
  Kalender-Widget im DayPlan-Kalender"` (fehlender `useDayPlanEvents`-Mock) — gehört zum Calendar-Strang,
  bewusst nicht angefasst.

## Leitfaden-Pflege
- Architektur: kein neues Datenmodell (nutzt `diaryEntries`); `GET /diary` ist additiv im bestehenden
  diary-Bereich → kein Handlungsbedarf über den bereits dokumentierten §1/§2-Eintrag hinaus.
- Design: kein neues visuelles Muster (WidgetShell + RichTextInlineField wiederverwendet) → kein Handlungsbedarf.
