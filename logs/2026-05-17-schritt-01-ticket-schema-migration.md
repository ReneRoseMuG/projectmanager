# Log: Ticket-Schema & Migration

**Datum:** 17.05.26  
**Schritt:** 1 — Datenbankschema & Migration  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Drizzle-Schema wurde um die Ticket-Domäne erweitert. Ergänzt wurden Ticket-Enums, die Tabellen `tickets`, `ticket_relations`, `ticket_tags` und `ticket_notes` sowie der neue Comment-Entity-Type `ticket`. Die `attachments`-Tabelle unterstützt jetzt `ticketId` als weiteren gegenseitig exklusiven Owner. Die von `drizzle-kit` erzeugte Migration wurde manuell korrigiert, weil SQLite die bestehende CHECK-Constraint der Attachment-Tabelle nicht per einfachem `ALTER TABLE` ersetzen kann. Die Migration wurde lokal angewendet und per DB-Readback geprüft.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/db/schema.ts` | geändert | Ticket-Enums, Ticket-Tabellen, `COMMENT_ENTITY_TYPES` und `attachments.ticketId` ergänzt |
| `apps/api/src/db/migrations/0010_crazy_zuras.sql` | neu | Versionierte Migration für Ticket-Tabellen und Attachment-Rebuild |
| `apps/api/src/db/migrations/meta/0010_snapshot.json` | neu | Drizzle-Snapshot zur neuen Migration |
| `apps/api/src/db/migrations/meta/_journal.json` | geändert | Migration im Drizzle-Journal registriert |
| `apps/api/src/services/attachments.service.ts` | geändert | `ticketId` im Attachment-Mapping ergänzt |

## Probleme und Abweichungen

`drizzle-kit` hatte für `attachments` zunächst nur ein `ALTER TABLE ADD ticket_id` generiert. Das hätte die bestehende Owner-CHECK-Constraint nicht korrekt aktualisiert, deshalb wurde die Migration manuell auf einen Tabellen-Rebuild angepasst. Der erste API-TypeScript-Lauf schlug erwartbar fehl, bis die Shared Types in Schritt 2 um `ticket` erweitert wurden.

## Offene Punkte / Folgeaufgaben

Backend-Service und Routen für Tickets werden in den nächsten Schritten ergänzt.
