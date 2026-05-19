# Log: Test- und Abnahme-Gate

**Datum:** 19.05.26  
**Schritt:** 10 — Test- und Abnahme-Gate  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Das Abschluss-Gate wurde seriell ausgeführt. Die Datenbankmigration lief erfolgreich durch, Web-Unit-Tests, Playwright-E2E-Tests, Build und Lint sind grün. Die API-Test-Suite ist weiterhin rot; zur belastbaren Zählung wurde sie nach dem ersten Lauf zusätzlich mit JSON-Reporter in eine temporäre Datei geschrieben. Es wurden nach den Testfehlern keine Korrekturen am Produktionscode oder an Tests vorgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-05-19-schritt-10-test-und-abnahme-gate.md` | neu | Zusammenfassung von Migration, Tests, Build, Lint und Abnahmeblockern |
| `logs/README.md` | geändert | Log-Index um Aufgabe 10 ergänzt |

## Probleme und Abweichungen

Ausgeführte Kommandos:

| Kommando | Status | Ergebnis |
|---|---:|---|
| `npm run db:migrate -w apps/api` | ✅ | Migration erfolgreich angewendet |
| `npm run test -w apps/api` | 🔴 | 280 Tests, 250 grün, 30 rot, 0 übersprungen |
| `npm run test -w apps/web` | ✅ | 24 Testdateien, 182 Tests grün |
| `npm run e2e -w apps/web` | ✅ | 35 Playwright-Tests grün |
| `npm run build` | ✅ | Shared Types, API und Web gebaut; Vite meldet nur die bekannte Chunk-Größenwarnung |
| `npm run lint` | ✅ | Web- und API-Lint grün |

Gesamt über API, Web und E2E: 497 Tests ausgeführt, 467 grün, 30 rot, 0 übersprungen, 0 blockiert.

Fehlergruppe „kann durch Test- oder Fixture-Anpassungen gelöst werden“:

- 27 API-Tests senden alte PATCH- oder Board-Move-Payloads ohne `expectedVersion` und erhalten deshalb jetzt erwartungsgemäß `400 BAD_REQUEST` statt `200` oder `404`.
- 2 Delete-Cascade-Tests erzeugen Kommentare direkt über die alten `entityType`-/`entityId`-Spalten ohne Junction-Eintrag; das widerspricht dem neuen Comment-Junction-Zielmodell.

Fehlergruppe „muss in Produktionscode gelöst werden“:

- 1 Dump-Table-Contract-Test ist rot, weil die Dump-Registry die neuen Anwendungstabellen noch nicht kennt: `users`, Comment-Junction-Tabellen und Attachment-Junction-Tabellen.

## Offene Punkte / Folgeaufgaben

Die API-Testdaten und API-Testannahmen müssen auf den neuen `expectedVersion`-Kontrakt und auf Junction-basierte Comment-Owner umgestellt werden. Zusätzlich muss die Dump-Registry um die neuen Tabellen erweitert werden. Erst danach kann Aufgabe 09 erneut bewertet und die Legacy-Spalten-Drop-Migration sicher vorbereitet werden.
