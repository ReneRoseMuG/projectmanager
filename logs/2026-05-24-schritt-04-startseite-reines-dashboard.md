# Log: Startseite Reines Dashboard

**Datum:** 24.05.26  
**Schritt:** 4 — Startseite zu reinem Dashboard vereinfachen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Startseite rendert nun ausschließlich den `PageHero` und das `HomeDashboard` mit ausgeblendetem Inline-Header. Der bisherige hardcodierte Kalenderbereich wurde entfernt, weil Kalender und nächste Termine nun als Dashboard-Widgets verfügbar sind. Nicht mehr benötigte Kalender-Hooks, Kalender-Komponenten und EmptyState-Importe wurden entfernt. Der bestehende `dashboards:read`-Guard und die `ForbiddenPage` bleiben unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/StartPage.tsx` | geändert | Hardcodierte Kalender- und Dashboard-Sektion entfernt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Tests mit Erwartungen auf `start-calendar-preview` oder `start-dashboard-section` müssen im Testschritt angepasst werden.
