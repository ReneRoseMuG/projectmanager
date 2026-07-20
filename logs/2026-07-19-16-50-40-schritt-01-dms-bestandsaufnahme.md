# Log: DMS-Bestandsaufnahme

**Datum:** 19.07.26  
**Uhrzeit:** 16:50:40  
**Schritt:** 1 — DMS-Bestandsaufnahme und Migrationsvorprüfung  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der bestehende DMS-Datenbestand, die Owner-Verknüpfungen, Kategorien, Tags, Sammlungen und physischen Dateien wurden ausschließlich lesend geprüft. Die Daten erfüllen bereits die geplante Regel von höchstens einer direkten Sammlung je Attachment; Zyklen und Kategorie-/Tag-Namenskonflikte wurden nicht gefunden. Ein SHA-256-Vorabscan hat drei Duplikatgruppen mit sechs Dateien sowie einen getrennten Dateifehler identifiziert. Die Ergebnisse, Skalierungsrisiken, Kollationsabweichungen und verbindlichen Migrations-Gates wurden ohne personenbezogene Dateinamen dokumentiert. Die Wiederherstellungsprobe bleibt offen, weil die frühere Backup-Funktion im aktuellen Repository nicht mehr existiert und ihr Neuaufbau nicht Bestandteil von MS-80 ist.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/dms-ms-80-bestandsaufnahme.md` | neu | Lesender Ausgangsbefund und Migrations-Gates für MS-80 |
| `logs/2026-07-19-16-50-40-schritt-01-dms-bestandsaufnahme.md` | neu | Schritt-Log zur Bestandsaufnahme |
| `logs/README.md` | geändert | Neuer Log-Eintrag in der Übersicht |

## Probleme und Abweichungen

Die Wiederherstellungsprobe ist nicht erreichbar, weil die dafür vorausgesetzte Backup-Funktion im aktuellen Codebestand entfernt wurde. Die Graphify-Abfrage war wegen einer lokalen `uv`-Trampoline-Fehlfunktion nicht ausführbar; die Analyse wurde deshalb mit gezielter Quelltext- und Datenprüfung fortgesetzt. Attachment-ID `167` verweist auf eine fehlende oder nicht lesbare Datei. Die Tabellen für Kategorien und Tags verwenden unterschiedliche Kollationen, was bei der späteren Datenmigration explizit behandelt werden muss.

## Offene Punkte / Folgeaufgaben

- Über den Umgang mit der nicht mehr vorhandenen Backup-/Restore-Funktion muss außerhalb des additiven MS-80-Umfangs entschieden werden.
- Der Dateifehler zu Attachment-ID `167` bleibt im manuellen Duplikat-Check sichtbar und wird nicht automatisch verändert.
- Die drei gefundenen Duplikatgruppen werden ausschließlich diagnostisch ausgewiesen; eine automatische Zusammenführung ist nicht vorgesehen.
- Es wurden keine Tests geändert oder ausgeführt. Der Schritt war eine lesende Bestands- und Migrationsvorprüfung.
