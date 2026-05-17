# Log: Delete-Cascade-Tests

**Datum:** 17.05.26  
**Schritt:** Fix — Delete-Cascade-Tests  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die testseitigen Blocker der Delete-Cascade-Suite wurden behoben, ohne Produktionscode zu ändern. Die Test-App setzt nun vor der Routenregistrierung ein temporäres, sicheres Content-Verzeichnis, damit Feature- und Wiki-Tests im Testmodus keine geschützten App-Verzeichnisse beschreiben. Zusätzlich wurde der Backlog-Delete-Test auf die vorhandene API-Route `DELETE /api/backlog/:id` angepasst. Danach lief die vollständige Suite `tests/integration/delete-cascade.test.ts` erfolgreich durch.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/tests/helpers/app.ts` | geändert | Temporäres Content-Verzeichnis für Test-App gesetzt und beim App-Schließen bereinigt |
| `apps/api/tests/integration/delete-cascade.test.ts` | geändert | Backlog-Delete-Test auf bestehende Route angepasst |
| `logs/2026-05-17-fix-delete-cascade-tests.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Die Änderung betrifft ausschließlich Testcode und Log-Dateien. Produktionscode unter `apps/api/src` wurde für diesen Schritt nicht geändert.

## Offene Punkte / Folgeaufgaben

Keine.
