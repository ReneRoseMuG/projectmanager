# MS-80 – DMS-Bestandsaufnahme und Migrationsvorprüfung

**Stand:** 19.07.26  
**Arbeitszweig:** `feature/ms-80-dms-refactoring`  
**Datenzugriff:** ausschließlich lesend

## Zweck

Diese Bestandsaufnahme dokumentiert den Ausgangszustand vor den additiven DMS-Änderungen aus MS-80. Sie dient als Gate für Schemaänderungen, Datenmigrationen und die spätere Bereinigung von Kategorien. Personenbezogene Dateinamen oder Dateiinhalte werden nicht protokolliert.

## Datenbestand

| Bereich | Anzahl |
|---|---:|
| Attachments | 485 |
| Projekt-Verknüpfungen | 7 |
| Meilenstein-Verknüpfungen | 62 |
| Aufgaben-Verknüpfungen | 74 |
| Feature-Verknüpfungen | 24 |
| Wiki-Seiten-Verknüpfungen | 15 |
| Ticket-Verknüpfungen | 3 |
| DMS-Kategorien | 12 |
| Kategorie-Verknüpfungen | 348 |
| DMS-Tags | 4 |
| PM-Tags | 9 |
| Attachment-Tag-Verknüpfungen | 4 |
| Sammlungen | 7 |
| Sammlungs-Verknüpfungen | 485 |

## Integritätsprüfung

- 334 Attachments besitzen keine fachliche Owner-Verknüpfung. Sie sind im heutigen Modell dennoch Bestandteil der DMS-Bibliothek.
- Kein Attachment ist mehreren Sammlungen zugeordnet. Damit ist der Datenbestand für eine Eindeutigkeitsregel „höchstens eine direkte Sammlung je Dokument“ vorbereitet.
- Es wurden keine Zyklen in der bestehenden Sammlungshierarchie gefunden.
- Es bestehen keine Namenskonflikte zwischen vorhandenen DMS-Kategorien und DMS-Tags.
- Die physische Datei zu Attachment-ID `167` fehlt oder ist nicht lesbar. Dieser Datensatz muss bei Dateioperationen als separater Fehler ausgewiesen werden.
- Die Tabellen für Kategorien und Tags verwenden unterschiedliche Kollationen. Vergleiche während der Migration müssen deshalb eine gemeinsame Kollation explizit festlegen.

## Duplikat-Vorprüfung

Die vorhandenen Dateien wurden in einem einmaligen, lesenden Vorabscan inhaltsbasiert mit SHA-256 geprüft. 484 Dateien konnten gelesen werden; Attachment-ID `167` wurde als Dateifehler getrennt erfasst.

Es wurden drei Duplikatgruppen mit insgesamt sechs Dateien gefunden:

- Attachment-IDs `19` und `219`
- Attachment-IDs `213` und `218`
- Attachment-IDs `214` und `215`

Der Scan hat weder Dateien noch Metadaten, Verknüpfungen, Tags oder Sammlungen verändert. Die gefundenen Gruppen verhindern derzeit einen eindeutigen Hash-Index und eine nicht näher definierte automatische Wiederverwendung eines vorhandenen Attachments.

## Technischer Ausgangszustand

- `attachments` enthält noch kein Inhalts-Hashfeld und kein Merkmal für die Sichtbarkeit in der Dokumentenbibliothek.
- `folder_attachments` ist technisch eine n:m-Zuordnung; die Daten erfüllen bereits die geplante 0..1-Regel je Attachment.
- `tags.name` ist global eindeutig, obwohl Tags fachlich über `domain` getrennt werden. Eine domänenspezifische Eindeutigkeit ist erforderlich, bevor Kategorien zuverlässig als DMS-Tags übernommen werden.
- Dokumentfilter, Relationsermittlung und Paginierung werden derzeit überwiegend im Anwendungsspeicher ausgeführt. Das skaliert mit dem Gesamtbestand statt mit der angeforderten Seite.
- Die Owner-Ermittlung der Attachment-Liste erzeugt pro Attachment mehrere Einzelabfragen und damit ein N+1-Zugriffsmuster.
- Kategorien, Tags und Sammlungen sind parallel aktiv; Sammlungen erlauben technisch Mehrfachzuordnungen, obwohl der aktuelle Datenbestand diese Möglichkeit nicht nutzt.

## Migrations-Gates

Vor der fachlichen Umschaltung gelten folgende Bedingungen:

1. Die additive Migration setzt für alle 485 bestehenden Attachments die Bibliothekssichtbarkeit auf `true`, damit sich die heutige Sicht nicht unbeabsichtigt ändert.
2. Die 0..1-Sammlungsregel darf erst nach einer erneuten Vorprüfung als Datenbank-Constraint aktiviert werden.
3. Die Kategorie-zu-Tag-Migration muss idempotent sein, die Kollation explizit behandeln und bestehende gleichnamige DMS-Tags wiederverwenden.
4. Kategorien und ihre Tabellen dürfen erst in einem gesonderten, destruktiven Bereinigungsschritt entfernt werden, nachdem die migrierten Zuordnungen fachlich und technisch verifiziert wurden.
5. Die bestehende Duplikatlage erlaubt keinen eindeutigen Hash-Index. Der manuelle Duplikat-Check bleibt diagnostisch und führt keine automatische Zusammenführung aus.
6. Fehlende Dateien müssen in Scan- und Migrationsberichten separat erscheinen und dürfen andere Datensätze nicht blockieren.

## Offener Abnahmepunkt

Eine Wiederherstellungsprobe über die frühere Backup-Funktion konnte nicht ausgeführt werden, weil diese Funktion im aktuellen Repository nicht mehr vorhanden ist. Ein Neuaufbau der Backup-Funktion gehört nicht zum freigegebenen MS-80-Umfang. Die Bestandsaufnahme ist deshalb in diesem Punkt nur teilweise abgeschlossen; die unabhängigen additiven Schritte können fortgesetzt werden.

## Nachtrag zum Cleanup-Gate am 19.07.26

Der damalige offene Abnahmepunkt ist für den später freigegebenen Cleanup aufgelöst. `scripts/ms80-backup.mjs` hat Datenbank und Uploadverzeichnis als gekoppeltes Manifest gesichert. Das Backup `backups/ms80-2026-07-19T17-09-17-317Z` wurde vollständig in eine isolierte lokale Testdatenbank und ein temporäres Uploadverzeichnis rückgespielt; Tabellenzahlen, Dateiliste und SHA-256-Prüfsummen stimmen. Erst danach wurde die wiederanlaufsichere Kategorie-Cleanup-Migration angewandt. Details stehen in [dms-ms-80-benutzer-und-betriebshandbuch.md](./dms-ms-80-benutzer-und-betriebshandbuch.md).

## Werkzeughinweis

Die laut Claude-Regelwerk bevorzugte Graphify-Abfrage war nicht ausführbar, weil die lokale `uv`-Trampoline-Auflösung den Skriptpfad nicht kanonisieren konnte. Die Bestandsaufnahme erfolgte ersatzweise durch gezielte Quelltextsuche, vollständige Lektüre der betroffenen Module und lesende Datenbank-/Dateisystemprüfungen.
