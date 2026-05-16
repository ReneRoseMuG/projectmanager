# Log: NotFound und ErrorBoundary

**Datum:** 16.05.26  
**Schritt:** 11 — NotFoundPage + ErrorBoundary  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die NotFoundPage wurde als zweispaltige Studie-2-Fehlerseite mit Route-Pill, Erklärung, Aktionsbuttons und 404-Visual neu aufgebaut. Eine ForbiddenPage wurde als vorbereitete 403-Stub-Seite ergänzt. Ein React ErrorBoundary fängt Render-Crashes ab, zeigt im Development den Stacktrace und bietet Neu laden, Fehler melden und Zur Startseite an. Der ErrorBoundary ist global in `main.tsx` eingebunden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/NotFoundPage.tsx` | geändert | Neue 404-Seite |
| `apps/web/src/pages/ForbiddenPage.tsx` | neu | Vorbereitete 403-Seite |
| `apps/web/src/components/error/ErrorBoundary.tsx` | neu | Globaler React ErrorBoundary |
| `apps/web/src/App.tsx` | geändert | `/forbidden`-Route ergänzt |
| `apps/web/src/main.tsx` | geändert | ErrorBoundary eingebunden |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Echte Rechteprüfung für `/forbidden` bleibt ein späterer Auth-Auftrag.
