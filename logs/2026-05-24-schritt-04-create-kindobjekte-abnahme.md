# Log: Create-Kindobjekte Abnahme

**Datum:** 24.05.26  
**Schritt:** 4 — Serielle Testabnahme  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die vereinbarten Testkommandos wurden seriell ausgeführt. Der API-Testlauf wurde nach einem Tool-Timeout mit längerem Timeout wiederholt und lief vollständig grün durch. Der Web-Unit-Testlauf und der Browser-/E2E-Lauf wurden trotz Fehlern vollständig weitergeführt und die Fehlergruppen dokumentiert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-24-schritt-01-create-kindobjekte-ui.md` | neu | UI-Umsetzung und offene Persistenzlücke dokumentiert |
| `logs/2026-05-24-schritt-02-kindobjekte-integrationstests.md` | neu | Integrationstest-Erweiterung dokumentiert |
| `logs/2026-05-24-schritt-03-create-kindobjekte-browsertests.md` | neu | Browser-Test-Erweiterung und Fehler dokumentiert |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

`npm run test -w apps/api` ist grün: 35 Testdateien, 372 Tests bestanden. `npm run test -w apps/web` ist rot: 72 Testdateien, 431 Tests ausgeführt, 424 bestanden, 7 fehlgeschlagen. Davon betreffen 2 Fehler `ProjectsPage` ohne `QueryClientProvider`, 4 Fehler bestehende UI-Klassen-Erwartungen in ListBoardView/ProjectForm und 1 Fehler StatusPill-Fallback-Klassen. `npm run e2e -w apps/web` ist rot: 79 Tests ausgeführt, 72 bestanden, 7 fehlgeschlagen.

## Offene Punkte / Folgeaufgaben

- Web-Unit-Testumgebung oder `ProjectsPage` so anpassen, dass `useQueryClient` in Tests versorgt wird.
- Bestehende UI-Klassen-Erwartungen an die aktuelle Button-/StatusPill-Gestaltung anpassen oder UI zurückführen.
- Rote Create-Kindobjekt-E2E-Fälle aus Schritt 3 nachziehen.
