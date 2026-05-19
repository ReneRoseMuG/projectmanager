# Log: Agents Milestone Gate

**Datum:** 20.05.26  
**Schritt:** Fix — Agents Milestone Gate  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Architektur-Referenz in `agents.md` wurde an den aktuellen Milestone-Stand angepasst. Domäne 1 nennt nun `milestones` als Projekt-Subdomäne und beschreibt Tasks nicht mehr als direkte `projectId`-Objekte, sondern als owner-unabhängige Objekte mit Owner-Join-Tabellen. Die Dokumentations- und Ticket-Referenzen nennen die vorhandenen Milestone-Joins. Die Querschnittsinfrastruktur für Tags, Notes, Attachments, Comments und Calendar enthält jetzt die Milestone-Träger und die zugehörigen Join-Tabellen. Anschließend wurde der Gate-Lauf seriell ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `agents.md` | geändert | Domänen- und Querschnittsarchitektur um Milestones und aktuelle Owner-Joins ergänzt |
| `logs/2026-05-20-fix-agents-milestone-gate.md` | neu | Ergebnis der Doku-Korrektur und des Gate-Laufs dokumentiert |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der Gate-Lauf ist nicht vollständig grün. `npm run db:migrate -w apps/api` lief erfolgreich. `npm run test -w apps/api` lief grün mit 25 Testdateien und 292 Tests. `npm run test -w apps/web` lief grün mit 34 Testdateien und 212 Tests; es gab nur React-Router-Future-Flag-Warnungen. `npm run e2e -w apps/web` lief mit 42 Tests, davon 39 grün und 3 rot.

Rote E2E-Tests:
- `e2e/owner-tasks.spec.ts:184` — Use-Case-Detail: Aufgaben-Tab unterstützt Create, Link, Navigation und Remove.
- `e2e/project.spec.ts:49` — Projekt erstellen: Plus-Button navigiert auf Create-Detailseite und speichert als Detailroute.
- `e2e/project.spec.ts:217` — Feature erstellen aus Projekt-Tab nutzt die Feature-Create-Detailroute und verknüpft echte Daten.

Alle drei Fehler brechen beim `fillRichText`-Helper ab, weil der erwartete `[contenteditable="true"]`-Editor im jeweiligen Formular nicht gefunden wird. Gemäß Testlauf-Regel wurden nach dem fehlgeschlagenen E2E-Lauf keine eigenständigen Fixes vorgenommen.

## Offene Punkte / Folgeaufgaben

- E2E-RichText-Helper oder betroffene Formular-Testannahmen in einem separaten Folgeauftrag prüfen.
- Danach `npm run e2e -w apps/web` erneut seriell ausführen.
