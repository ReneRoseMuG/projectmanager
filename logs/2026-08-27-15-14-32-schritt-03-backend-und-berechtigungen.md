# Log: Backend und Berechtigungen

**Datum:** 27.08.26  
**Uhrzeit:** 15:14:32  
**Schritt:** 3 — Repositories, Services, Routen und getrennte Berechtigungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Parent-Dateiansicht besitzt nun eigene Repositories, Services und versionierte Routen für Parent-Ordner, Attachment-Zuordnungen und explizite DMS-Dokumentlinks. Parent-Uploads erzeugen immer exklusive `parent_attachment`-Datensätze; die bisherige Upload-Auswahl und automatische Überführung ins DMS wurden aus den Routen entfernt. Das Lösen eines Dokumentlinks entfernt ausschließlich die Relation, während das Löschen eines Parent-Anhangs dessen Datensatz und physische Datei entfernt. DMS-Inhalt, Vorschau, lokales Öffnen und Löschen laufen nun über eigene `/documents`-Routen und die neue Permission-Ressource `documents`. Alle sechs unterstützten Parent-Typen verwenden dieselben fachlichen Regeln ohne N+1-Abfragen in Listenpfaden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/repositories/parent-file.repository.ts` | neu | Owner-spezifische Parent-Ordner und Dokumentlinks gekapselt |
| `apps/api/src/services/parent-files.service.ts` | neu | Ordner-, Link-, Move-, Versions- und Zyklusregeln umgesetzt |
| `apps/api/src/routes/parent-files.ts` | neu | Geschützte Routen für alle sechs Parent-Typen |
| `apps/api/src/services/attachments.service.ts` | geändert | Exklusive Parent-Uploads und getrennte Datei-Lebenszyklen |
| `apps/api/src/services/document.service.ts` | geändert | DMS-Dokumente ausschließlich über die Dokumentdomäne ausgeliefert |
| `apps/api/src/routes/attachments.ts` | geändert | Parent-Uploads ohne DMS-Auswahl, Parent-Löschen dauerhaft |
| `apps/api/src/routes/tickets.ts` | geändert | Ticket-Anhänge an denselben getrennten Vertrag angepasst |
| `apps/api/src/routes/dms.ts` | geändert | Eigene Dokumentrouten und `documents`-Permissions |
| `apps/api/src/plugins/auth.ts` | geändert | Dokumentpfade der neuen Permission-Ressource zugeordnet |
| `apps/api/src/plugins/realtime.ts` | geändert | Dokumentänderungen als eigener Invalidierungsscope publiziert |
| `tests/integration/api/parent-files.test.ts` | neu | Reale Parent-Ordner-, Link- und Lebenszyklustests |
| `tests/integration/api/parent-files-auth.test.ts` | neu | Reale Session- und Permission-Trennungstests |

## Testleitplanken

Der Testentwurfs-Skill `test-entwurfsleitplanken` wurde angewendet. Abgedeckt ist die Integrationsebene mit echten Fastify-Routen, echten Sessions, einer isolierten MySQL-Datenbank und einem eigenen Upload-Temp-Root. Ohne Mocks wurden alle sechs Owner-Typen, Ordnerisolation, Zyklen, doppelte Links, Versionskonflikte, physisches Löschen, Relationserhalt sowie Positiv- und Negativfälle für `attachments` und `documents` geprüft.

## Probleme und Abweichungen

Ein erster Testlauf zeigte, dass ein zusätzlicher Route-Guard im bewusst authfreien Integrationstest keine Session-Dekoration vorfand. Der Guard berücksichtigt nun den etablierten authfreien Testmodus; in produktiven und authaktivierten Tests werden weiterhin beide benötigten Permissions erzwungen. Danach waren beide neuen Integrationssuiten grün.

## Offene Punkte / Folgeaufgaben

Bestehende Legacy-Tests, MCP-Verträge und die Browseroberfläche müssen noch vollständig auf die getrennten Verträge nachgeführt werden.
