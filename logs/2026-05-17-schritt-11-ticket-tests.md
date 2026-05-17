# Log: Ticket-Tests

**Datum:** 17.05.26  
**Schritt:** 11 — Tests  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die API-Testabdeckung wurde um Ticket-Factories und eine neue Integrationstestdatei für die Ticket-Domäne erweitert. Abgedeckt sind CRUD, Validierung, Statuswechsel mit `resolvedAt`, Sub-Tickets, Relationen, Tags, Notizen, Kommentare, Attachments und Project-Cascade. Die Test-App registriert die Ticket-Routen und den Multipart-Support für Attachment-Tests. Außerdem wurden die Dump-Registry und der Seed-Daten-Test an die neuen Ticket-Tabellen und das zusätzliche Ticket-Attachment angepasst. Der vollständige API-Testlauf wurde anschließend erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/tests/helpers/app.ts` | geändert | Ticket-Routen und Multipart-Support in Test-App registriert |
| `apps/api/tests/helpers/db.ts` | geändert | Ticket-Tabellen in Test-Truncation aufgenommen |
| `apps/api/tests/helpers/factories.ts` | geändert | Ticket- und Sub-Ticket-Testfactories ergänzt |
| `apps/api/tests/integration/tickets.test.ts` | neu | Integrationstests für Ticket-Endpunkte und Querschnittsfunktionen |
| `apps/api/src/services/dump.service.ts` | geändert | Ticket-Tabellen in Dump-Registry aufgenommen |
| `apps/api/tests/integration/seed-data.test.ts` | geändert | Seed-Erwartung für zusätzliches Ticket-Attachment aktualisiert |
| `apps/web/src/components/tickets/ProjectTicketPanel.tsx` | geändert | Nach dem Setzen von Ticket-Tags wird die Projekt-Ticketliste neu geladen |

## Probleme und Abweichungen

Der erste vollständige API-Testlauf schlug in zwei bestehenden Tests fehl: Die Dump-Registry enthielt die neuen Ticket-Tabellen noch nicht, und der Seed-Test erwartete weiterhin drei statt vier Seed-Attachments. Beide Punkte wurden auf den direkt betroffenen Stellen korrigiert. Der anschließende gezielte Lauf für `dumps-drive.test.ts` und `seed-data.test.ts` war grün, danach war auch der vollständige API-Testlauf grün.

## Offene Punkte / Folgeaufgaben

Keine.
