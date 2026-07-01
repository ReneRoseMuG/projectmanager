# Log: Ticket-Listen-Skalierung

**Datum:** 01.07.26  
**Uhrzeit:** 17:26:50  
**Schritt:** Fix — Ticket-Listen-Skalierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Ticket-Listenabbildung wurde auf Bulk-Laden umgestellt, damit globale Ticketlisten, Owner-Listen und Subticket-Listen nicht mehr pro Ticket eigene Nebenabfragen für Tags, Support-Zähler, Subticket-Zähler und User-Optionen auslösen. Für die globale Ticketliste werden Parent-Kontexte jetzt in festen Bulk-Abfragen über alle Ticket-IDs geladen und danach pro Ticket zugeordnet. Der bestehende Einzelmapper bleibt für Detail- und Einzeloperationen erhalten, nutzt intern aber denselben Datenmapper. Dadurch bleibt die vorhandene DTO-Struktur unverändert, während die Anzahl der Datenbankabfragen bei großen Listen nicht mehr linear mit jedem Nebenfeld wächst.

Für die Teständerung wurden die `planungsleitplanken` und `test-entwurfsleitplanken` angewendet. Testebene ist Integration: echte Fastify-App, migrierte MySQL-Testdatenbank, per Test geleerte Tabellen und keine Mocks. Bewiesen wird, dass `GET /api/tickets` 500 Top-Level-Tickets inklusive User-Optionen, leerer Support-Zähler und einem repräsentativen Parent-Kontext erfolgreich zurückliefert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tickets.service.ts` | geändert | Ticket-Listenmapping auf Bulk-Queries für User, Tags, Counts, Support-Zähler und Parent-Kontexte umgestellt |
| `tests/integration/api/tickets.test.ts` | geändert | 500-Ticket-Regressionstest für `GET /api/tickets` ergänzt und Testleitplanken im Kopf dokumentiert |
| `logs/2026-07-01-17-26-50-fix-ticket-listen-skalierung.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um diesen Eintrag ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.

## Verifikation

- `npm run typecheck -w apps/api` ✅
- `npm run test -w apps/api -- tests/integration/api/tickets.test.ts` ✅ — 52 Tests bestanden, inklusive `GET /api/tickets listet 500 Tickets ohne Pool-Queue-Überlauf`.
