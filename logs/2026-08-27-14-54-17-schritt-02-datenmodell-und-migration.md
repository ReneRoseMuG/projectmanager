# Log: Datenmodell und Migration

**Datum:** 27.08.26  
**Uhrzeit:** 14:54:17  
**Schritt:** 2 — Datenmodell und wiederanlaufsichere Migration  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Globale DMS-Dokumente und exklusive Parent-Anhänge wurden durch das persistierte Feld `kind` fachlich getrennt. Für alle sechs unterstützten Parent-Typen wurden eigene virtuelle Attachment-Ordner und versionierte Dokumentverknüpfungen ergänzt; die bestehenden Attachment-Junctions tragen nur noch die Parent-Ordnerzuordnung. Die Migration überführt bestehende sichtbare Dokument-Owner-Zuordnungen verlustfrei in die neuen Link-Tabellen, lässt exklusive Parent-Anhänge bei genau einem Owner und führt benutzerdefinierte `attachments`-Berechtigungen für die neue Ressource `documents` nach. Mehrdeutige Legacy-Daten werden vor irreversiblen Änderungen abgewiesen. Ein echter MySQL-Integrationstest beweist Datenübernahme und Wiederanlaufsicherheit.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Getrennte Attachment-Arten, Parent-Ordner und Dokumentlinks typisiert |
| `apps/api/src/db/schema.ts` | geändert | Parent-Ordner- und Dokumentlink-Tabellen für sechs Owner ergänzt |
| `apps/api/src/db/migrations/20260827082638_brave_human_cannonball/migration.sql` | neu | Wiederanlaufsichere Daten- und Schema-Migration |
| `apps/api/src/db/migrations/20260827082638_brave_human_cannonball/snapshot.json` | neu | Generierter Drizzle-Snapshot |
| `tests/fixtures/api/db.ts` | geändert | Neue Tabellen in isolierter Testbereinigung berücksichtigt |
| `tests/integration/api/attachment-domain-separation-migration.test.ts` | neu | Reale MySQL-Prüfung von Übernahme und Wiederanlauf |

## Testleitplanken

Der Testentwurfs-Skill `test-entwurfsleitplanken` wurde angewendet. Abgedeckt ist die Integrationsebene mit einer zufällig benannten echten MySQL-Testdatenbank ohne Mocks. Bewiesen werden Legacy-Backfill, exklusive Parent-Zuordnung, Relationserhalt für DMS-Dokumente, Permission-Nachführung und ein zweiter identischer Migrationslauf.

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die neuen Persistenzstrukturen werden im folgenden Schritt vollständig über Services, Routen und Berechtigungsgrenzen angebunden.
