# Log: Design Quick Wins

**Datum:** 21.05.26  
**Schritt:** 1 — Design Quick Wins  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die isolierten Text-, Stil- und Attributkorrekturen wurden umgesetzt. Das API-Badge nutzt deutsche Statusbegriffe, die Login-Seite verwendet den gültigen hellgrauen Textton und fokussiert das E-Mail-Feld automatisch. Der ColorPicker zeigt „Eigene Farbe“, Ghost-Buttons haben einen sichtbareren Hover-Hintergrund, die Projektbeschreibung startet mit fünf Mindestzeilen und der Wiki-Baum verwendet „Neue Seite“ statt „Root“. Die Änderungen bleiben vollständig im Frontend.

## Geänderte / angelegte Dateien

| Datei                                              | Art      | Kurzbeschreibung                                   |
| -------------------------------------------------- | -------- | -------------------------------------------------- |
| `apps/web/src/components/layout/TopBar.tsx`        | geändert | API-Statusbegriffe übersetzt                       |
| `apps/web/src/pages/LoginPage.tsx`                 | geändert | Textklasse korrigiert und Autofokus ergänzt        |
| `apps/web/src/components/ui/ColorPicker.tsx`       | geändert | Freie Farbeingabe deutsch beschriftet              |
| `apps/web/src/components/ui/Button.tsx`            | geändert | Ghost-Hover sichtbarer gemacht                     |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Beschreibungsfeld auf `minRows={5}` reduziert      |
| `apps/web/src/components/wiki/WikiTree.tsx`        | geändert | Root-Button in „Neue Seite“ umbenannt              |
| `tests/unit/web/components/ui/atoms.test.tsx`      | geändert | Button-, DatePicker- und Select-Regeln abgesichert |
| `tests/unit/web/pages/LoginPage.test.tsx`          | geändert | Login-Fokus und Untertitelton abgesichert          |

## Probleme und Abweichungen

`npm run test -w apps/web` und `npm run build -w apps/web` sind grün. `npm run e2e -w apps/web` ist nicht vollständig grün, weil fünf bestehende Kalender-Specs keine Termine im aktuellen Kalender-Viewport finden bzw. anschließend in Cleanup-Timeouts laufen; diese Kalenderlogik wurde in diesem Schritt nicht verändert.

## Offene Punkte / Folgeaufgaben

Kalender-E2E-Blocker separat prüfen: `tests/browser/web/calendar.spec.ts` verwendet Termine am 01.12.26, die beim aktuellen Kalenderstart nicht sichtbar sind.
