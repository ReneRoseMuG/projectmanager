# Log: E2E leere Tests

**Datum:** 17.05.26  
**Schritt:** Fix — E2E leere Tests und Test-Leitplanke  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die geskipten und leeren Playwright-Platzhalter für Feature- und Projekt-Flows wurden durch ausführbare Browser-Tests ersetzt. Die Feature-Suite enthält jetzt sieben reale Testfälle für Erstellen, Öffnen, Bearbeiten, Löschen, Projekt-Verknüpfung, Use-Case-Erstellung und Board-/Listenwechsel. Die Projekt-Suite enthält jetzt acht reale Testfälle für Erstellen, Farbauswahl, Öffnen, Bearbeiten, Löschen, Feature-Verknüpfung, Aufgabenerstellung und Board-/Listenwechsel. Vitest wurde so konfiguriert, dass Playwright-E2E-Dateien nicht mehr fälschlich als Vitest-Suites eingesammelt werden. Zusätzlich wurde in `agents.md` eine verbindliche Leitplanke ergänzt, die leere Tests, Platzhaltertests und nicht begründete `skip`-Tests verhindert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Leitplanke gegen leere Tests, Platzhaltertests und unbegründete Skip-Tests ergänzt |
| `apps/web/vite.config.ts` | geändert | Vitest schließt `e2e/**` aus |
| `apps/web/e2e/feature.spec.ts` | geändert | Leeres Skip-Gerüst durch sieben echte Feature-E2E-Tests ersetzt |
| `apps/web/e2e/project.spec.ts` | geändert | Leeres Skip-Gerüst durch acht echte Projekt-E2E-Tests ersetzt |
| `apps/web/e2e/task.spec.ts` | geändert | Modal-Locator an die stabilere Overlay-Struktur angepasst |
| `logs/2026-05-17-fix-e2e-leere-tests.md` | neu | Schritt-Log für diese Korrektur |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der zuletzt gestartete Task-E2E-Browserlauf wurde nach mehreren roten Task-Fällen abgebrochen und wird nicht als grüne Verifikation gewertet. In `apps/web/test-results` lagen danach Fehlerartefakte für zehn Task-E2E-Fälle vor; diese roten Task-E2E-Fälle bleiben gemäß Nutzeransage eine separate Folgeklärung. Aus den Browserläufen erzeugte ungetrackte E2E-Content-Dateien wurden entfernt.

## Offene Punkte / Folgeaufgaben

Die roten Task-E2E-Fälle müssen in einem eigenen Folgeauftrag analysiert und stabilisiert werden. Für den aktuellen Fix bleibt festzuhalten: Es gibt keine leeren oder geskipten Feature-/Projekt-E2E-Platzhalter mehr, und die neue Leitplanke in `agents.md` verhindert solche Platzhalter künftig.
