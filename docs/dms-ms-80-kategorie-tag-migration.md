# MS-80 – Konflikt- und Migrationsbericht Kategorien zu Tags

**Vorprüfung:** 19.07.26  
**Arbeitszweig:** `feature/ms-80-dms-refactoring`  
**Ziel-Domain:** `dms`

## Ausgangslage

Der erneute lesende Abgleich unmittelbar vor der Migration bestätigt 12 Kategorien mit insgesamt 348 Dokument-Kategorie-Verknüpfungen. In der DMS-Tag-Domain existiert für keinen Kategorienamen bereits ein Tag. Es gibt daher weder einen Farbkonflikt noch einen Konflikt mit einem geschützten System-Tag. Alle Kategorien können eindeutig als neue, ungeschützte DMS-Tags mit unverändertem Namen und unveränderter Farbe übernommen werden.

Der Abgleich verwendet für beide Namensspalten ausdrücklich `utf8mb4_unicode_ci`, weil Kategorie- und Tag-Tabelle im Ausgangszustand unterschiedliche Kollationen besitzen. Gleichnamige Tags anderer Domains werden nicht als DMS-Ziel wiederverwendet; die Eindeutigkeit des Tag-Modells gilt je `(domain, name)`.

## Eindeutige Zuordnung vor der Migration

| Kategorie-ID | Kategoriename | Farbe | Verknüpfungen | Auflösung |
|---:|---|---|---:|---|
| 1 | Logos, Icons und Etiketten | `#94a3b8` | 34 | neuen DMS-Tag anlegen |
| 2 | Strom/Steuerung/Verteilung | `#94a3b8` | 8 | neuen DMS-Tag anlegen |
| 4 | Winter | `#94a3b8` | 3 | neuen DMS-Tag anlegen |
| 5 | Trapezdach | `#94a3b8` | 16 | neuen DMS-Tag anlegen |
| 6 | Runddach | `#94a3b8` | 18 | neuen DMS-Tag anlegen |
| 7 | Oval Sauna | `#94a3b8` | 15 | neuen DMS-Tag anlegen |
| 8 | Fasssauna | `#94a3b8` | 14 | neuen DMS-Tag anlegen |
| 9 | Innenraum | `#94a3b8` | 205 | neuen DMS-Tag anlegen |
| 10 | Maßzeichnung/Plandokument | `#94a3b8` | 9 | neuen DMS-Tag anlegen |
| 11 | Transport | `#94a3b8` | 15 | neuen DMS-Tag anlegen |
| 12 | freigestellt | `#94a3b8` | 10 | neuen DMS-Tag anlegen |
| 13 | Luftbett | `#94a3b8` | 1 | neuen DMS-Tag anlegen |

**Konflikte:** keine.  
**Freigegebene automatische Auflösung:** 12 neue DMS-Tags, 0 Wiederverwendungen, 0 Überschreibungen.

## Technische Migrationsregeln

Die Custom-Migration `20260719155646_ms80_category_tags` prüft vor jeder Änderung erneut auf unter der Migrationskollation kollidierende Kategorienamen sowie auf inkompatible vorhandene DMS-Tags. Ein vorhandener DMS-Tag ist nur kompatibel, wenn Name und Farbe übereinstimmen und `is_system = false` gilt. Andernfalls wird die Transaktion kontrolliert mit `SIGNAL` abgebrochen.

Fehlende Tags werden mit `domain = 'dms'`, unverändertem Namen und unveränderter Farbe angelegt. Anschließend werden die 348 Kategorie-Relationen per `INSERT IGNORE` idempotent nach `attachment_tags` übertragen. Vor dem Commit prüft die Migration über die tatsächlichen Zielrelationen, dass keine Quellrelation ohne fachlich passenden DMS-Tag verblieben ist. Kategorien und Kategorie-Relationen bleiben bis zum separaten Cleanup erhalten.

## Ergebnisabgleich

Die Migration wurde am 19.07.26 regulär über `npm run db:migrate -w apps/api` angewandt. Der erste Aufruf brach vor dem Commit ab, weil auch der Farbvergleich der zwei Tabellen eine explizite gemeinsame Kollation benötigt. Der Transaktions-Handler rollte alle DML-Änderungen zurück. Nach Ergänzung von `utf8mb4_unicode_ci` für den Farbvergleich lief derselbe Migrationsschritt wiederanlaufsicher vollständig durch.

| Kennzahl | Vorher | Nachher | Bewertung |
|---|---:|---:|---|
| Kategorien | 12 | 12 | bis zum Cleanup unverändert |
| Kategorie-Relationen | 348 | 348 | bis zum Cleanup unverändert |
| DMS-Tags gesamt | 4 | 16 | exakt 12 neue Migrationstags |
| Attachment-Tag-Relationen gesamt | 4 | 352 | exakt 348 neue Zielrelationen |
| Fachlich abgeglichene Quellrelationen | 0 | 348 | vollständig |
| Nicht abgedeckte Quellrelationen | 348 | 0 | Nullverlust belegt |

Die neu angelegten DMS-Tags besitzen die IDs 14 bis 25. Für jede der zwölf Zuordnungen stimmen Name, Farbe und Zahl der verknüpften Attachments exakt mit der Quellkategorie überein; `is_system` ist jeweils `false`. Ein bewusst manuell ausgeführter zweiter Lauf derselben Custom-Migration änderte weder die 16 DMS-Tags noch die 352 Attachment-Tag-Relationen. Damit ist die Wiederanlauffähigkeit am migrierten Bestand nachgewiesen.

## Destruktiver Cleanup

Vor dem Cleanup wurde am 19.07.26 das gekoppelte Datenbank-/Upload-Backup `backups/ms80-2026-07-19T17-09-17-317Z` erzeugt und erfolgreich in eine isolierte lokale Testdatenbank sowie ein temporäres Uploadverzeichnis rückgespielt. Manifest, Tabellenzahlen, sämtliche Uploaddateien und beide SHA-256-Artefaktprüfsummen stimmen überein.

Die Migration `20260719171342_needy_karen_page` prüft unmittelbar vor `DROP TABLE`, dass jede Quellkategorie einen namens- und farbgleichen, ungeschützten DMS-Tag besitzt und jede der 348 Quellrelationen in `attachment_tags` vorhanden ist. Bei einer Abweichung bricht sie mit `SIGNAL` vor dem ersten destruktiven Statement ab. `DROP TABLE IF EXISTS` und die informationsschema-gestützte Vorprüfung machen den Schritt aus Teilzuständen wiederanlaufsicher.

Die Migration wurde am 19.07.26 erfolgreich über `npm run db:migrate -w apps/api` angewandt. `attachment_category_links` und `attachment_categories` sind danach nicht mehr Teil des produktiven Schemas. Rollback-Grenzen, Betriebsfolge und Monitoring stehen in [dms-ms-80-benutzer-und-betriebshandbuch.md](./dms-ms-80-benutzer-und-betriebshandbuch.md).
