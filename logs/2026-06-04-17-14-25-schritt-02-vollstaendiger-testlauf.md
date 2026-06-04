# Log: Vollständiger Testlauf

**Datum:** 04.06.26  
**Uhrzeit:** 17:14:25  
**Schritt:** 2 — Vollständiger Testlauf  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die vollständigen Testkommandos wurden seriell ausgeführt: `npm run test -w apps/api`, `npm run test -w apps/web` und `npm run e2e -w apps/web`. Die API-Tests liefen vollständig durch, endeten aber mit 18 roten Tests, 3 übersprungenen Tests und einer zusätzlich fehlgeschlagenen Suite durch einen MySQL-SSL-Handshake-Fehler. Die Web-Tests liefen ebenfalls vollständig durch und endeten mit 35 roten Tests, einem Suite-Importfehler und einem unhandled Error im RichText-Test. Der Browser/E2E-Lauf konnte keine Browser-Tests starten, weil der Playwright-WebServer beim API-Start an demselben MySQL-SSL-Handshake-Fehler scheiterte. Gemäß Testlauf-Regel wurden keine eigenständigen Fixes während des Testlaufs vorgenommen.

Testleitplanken: Betroffene Testebenen waren API-Integration/Unit, Web-Unit/Integration und Browser/E2E. Das zu beweisende Verhalten war der vollständige serielle Testlauf mit getrenntem Report für grüne, rote, übersprungene und blockierte Tests. Echte Daten blieben in Test-DBs, `tests/.runtime` und Temp-Verzeichnissen; es wurden keine Produktions-Upload-Pfade verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `logs/2026-06-04-17-14-25-schritt-02-vollstaendiger-testlauf.md` | neu | Schritt-Log zum vollständigen Testlauf |
| `logs/README.md` | geändert | Log-Index um den Testlauf ergänzt |
| `tests/.runtime/test-reports/2026-06-04-api-test.txt` | neu | Rohoutput des API-Testlaufs |
| `tests/.runtime/test-reports/2026-06-04-web-test.txt` | neu | Rohoutput des Web-Testlaufs |
| `tests/.runtime/test-reports/2026-06-04-e2e-test.txt` | neu | Rohoutput des Browser/E2E-Testlaufs |

## Probleme und Abweichungen

API: 44 Testdateien, davon 35 bestanden und 9 fehlgeschlagen; 526 Tests, davon 505 grün, 18 rot und 3 übersprungen. Zusätzlich blockierte `tests/integration/api/app.integration.test.ts` wegen `HANDSHAKE_SSL_ERROR` durch `self-signed certificate in certificate chain`.

Web: 94 Testdateien, davon 69 bestanden und 25 fehlgeschlagen; 621 Tests, davon 586 grün und 35 rot. Zusätzlich gab es einen Suite-Importfehler in `tests/integration/web/queries/invalidation.integration.test.ts` wegen `queryKeys.dumps.localStatus()` und einen unhandled Error im RichText-Highlight-Test.

Browser/E2E: Playwright startete keine Tests, weil `config.webServer` die API nicht starten konnte. Ursache war erneut der MySQL-SSL-Handshake-Fehler während der Migration vor dem API-Start.

Fehlergruppen: MySQL-Testinfrastruktur/SSL blockiert API-Suite und Browser/E2E; mehrere API-Erwartungen scheinen auf alten Kommentar-Plaintext statt HTML-Inhalt zu prüfen; Catalog-Delete-Tests erwarten `204`, erhalten aber `404`; `resolveBackupWorkDir` fehlt als Funktion; Attachment-Sync-Routentests registrieren nach Fastify-Boot; Web-Tests zeigen breite UI-Testdrift bei Boards, Sidebar, Parent-Badges und Formularen.

## Offene Punkte / Folgeaufgaben

Die offenen Testfehler müssen in einem separaten Folgeauftrag behandelt werden. Besonders zuerst zu klären ist die MySQL-SSL-Testkonfiguration, weil sie sowohl eine API-Suite als auch den gesamten Browser/E2E-Lauf blockiert.
