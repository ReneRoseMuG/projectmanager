# Log: Analyse Create-Kindobjekte und DnD

**Datum:** 24.05.26  
**Schritt:** Analyse — Rücksprung, vorgemerkte Kindobjekte, Ticket-DnD  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die offenen Fehler aus dem vorherigen E2E-Lauf wurden gezielt nachanalysiert. Die Rücksprung-Fehler in `create-child-elements.spec.ts` entstehen durch Tests, die Create-Seiten direkt ohne `returnTo` öffnen und anschließend eine Zielroute erwarten, die nicht der aktuellen Fallback-Logik entspricht. Für die fehlenden vorgemerkten Kindobjekte aus Meilenstein-Kartenmenüs wurde `MilestonesPage` als enger Produktionscode-Einstiegspunkt identifiziert: Die dortigen `createTask`- und `createTicket`-Handler nehmen nur die Basiseingaben entgegen und verarbeiten keine Pending-Kommentare, Notizen, Dateien oder Unterelemente. Der Ticket-DnD-Fehler wurde als Einzelfall erneut ausgeführt und war dabei nicht reproduzierbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-24-analyse-create-kindobjekte-dnd.md` | neu | Analyse-Log für offene Test- und Produktionscode-Punkte |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine Codeänderung an Rücksprungtests, Kindobjekt-Übernahme oder DnD wurde vorgenommen. Der gezielte Playwright-Aufruf mit Dateipfad musste korrigiert werden, weil `npm run e2e -w apps/web` relativ zu `apps/web` ausführt; danach lief der Einzeltitel `Ticket per` grün.

Testleitplanken: angewendet wurde der Repo-Skill `projekt-manager-test-entwurfsleitplanken`. Betroffen sind Web-Unit und Browser/E2E; Browsertests verwenden echte isolierte API-/Web-Testinstanzen.

## Offene Punkte / Folgeaufgaben

- Rücksprung-Erwartungen in `create-child-elements.spec.ts` testseitig bereinigen, vorzugsweise über explizite `returnTo`-Parameter.
- Für `MilestonesPage` einen Produktionscode-Fix planen und umsetzen, der Pending-Kommentare, Notizen, Dateien, Subtasks/Subtickets, Relationen und Tags analog zu den bestehenden Page-Handlern verarbeitet.
- Ticket-DnD im vollständigen E2E-Lauf nach den nächsten Fixes erneut beobachten; der isolierte Einzellauf war grün.
