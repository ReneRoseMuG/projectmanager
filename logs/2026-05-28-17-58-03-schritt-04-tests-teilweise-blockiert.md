# Log: Tests teilweise blockiert

**Datum:** 28.05.26  
**Uhrzeit:** 17:58:03  
**Schritt:** 4 — Tests und Abnahme  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Testschritt wurde begonnen und die vereinbarten Testebenen seriell angelaufen. `npm run test -w apps/mcp-server` lief erfolgreich mit 48 grünen Tests. `npm run test -w apps/api` wurde vollständig ausgeführt, endete aber rot mit 397 grünen und 35 fehlgeschlagenen Tests. `npm run test -w apps/web` wurde vollständig ausgeführt, endete aber rot mit 521 grünen und 30 fehlgeschlagenen Tests. Der E2E-Lauf `npm run e2e -w apps/web` wurde gestartet, dann durch Nutzerabbruch unterbrochen und ist daher nicht bewertbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-28-17-58-03-schritt-04-tests-teilweise-blockiert.md` | neu | Log zum aktuellen Test- und Abnahmestand |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

API-Fehlergruppen: mehrere Auth-/Bypass-Tests liefern `401` statt erwarteter Erfolgs- oder Forbidden-Antworten; ein DayPlan-Versionsschutzfall liefert `200` statt `400`; Dump-Tests scheitern gebündelt an `table day_plans has no column named notes`. Web-Fehlergruppen: neue `useAuth`-Nutzung in Formularen trifft in bestehenden Unit-Tests auf fehlenden `QueryClientProvider`; Rich-Text-Tests treffen auf ein Testdouble ohne `editor.state.selection`; eine Task-Datumsdarstellung erwartet die Crimson-Klasse am alten DOM-Knoten. Gemäß Repo-Regel wurden während des laufenden Testschritts keine eigenständigen Regression-Fixes vorgenommen.

## Offene Punkte / Folgeaufgaben

Die roten API- und Web-Tests müssen in einem Folgeauftrag gezielt bearbeitet werden. Der E2E-Lauf muss danach erneut vollständig seriell ausgeführt werden. Der Session-Kommentar an `PROJ-3` wurde noch nicht geschrieben, weil die Umsetzung nicht vollständig abgenommen ist.
