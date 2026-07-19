# Log: API-Testnachführung

**Datum:** 19.07.26  
**Uhrzeit:** 20:41:02  
**Schritt:** 14 — Veraltete MS-80-API-Tests und Fixtures nachführen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die sechs generischen Owner-Uploads wählen die Bibliothekssichtbarkeit nun ausdrücklich und prüfen sie im Ergebnis. Der Dateischutztest unterscheidet zwischen anonymem `401` und authentifiziertem `404` für nicht vorhandene statische Upload- und Vorschaupfade. Der Duplikat-Check verwendet statt eines unmöglichen ownerlosen SQL-Zustands ein reales, ownergebundenes und bibliotheksunsichtbares Attachment. Kategorie-Tag- und Cleanup-Fixtures liefern die verpflichtenden Tag-Zeitstempel; der Schema-Wiederanlauftest stützt den Fremdschlüssel vor dem simulierten Entfernen des Unique-Index technisch korrekt ab. Die Testentwurfsleitplanken wurden für reale MySQL-Integration, echte API-Aktionen, Berechtigungsfälle und temporäre Dateisystemisolation angewendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/integration/api/attachments.test.ts` | geändert | Explizite Sichtbarkeit und differenzierter Static-/Auth-Nachweis |
| `tests/integration/api/dms.test.ts` | geändert | Realistisches verborgenes Owner-Attachment |
| `tests/integration/api/dms-schema-migration.test.ts` | geändert | Technisch möglicher Migrations-Teilzustand |
| `tests/integration/api/dms-category-tag-migration.test.ts` | geändert | Vollständige Tag-Auditfelder in Fixtures |
| `tests/integration/api/dms-category-cleanup-migration.test.ts` | geändert | Vollständige Tag-Auditfelder in Fixtures |

## Probleme und Abweichungen

Keine fachlichen Abweichungen. Der gemeinsame Wiederholungslauf ist mit 5/5 Testdateien und 52/52 Testfällen grün; davon entfallen 34 grüne Fälle auf Attachments und die drei Migrationsbereiche.

## Offene Punkte / Folgeaufgaben

Keine.
