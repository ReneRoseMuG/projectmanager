# Log: App-Datenbank leeren

**Datum:** 18.05.26  
**Schritt:** Fix — App-Datenbank leeren  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die lokale SQLite-App-Datenbank unter `apps/api/data/taskmanager.sqlite` wurde geleert. Dabei wurden alle App-Tabellen bereinigt, die Drizzle-Migrationstabelle blieb unverändert, damit Schema- und Migrationsstand erhalten bleiben. Vor der Bereinigung enthielten die App-Tabellen zusammen 301 Datensätze. Nach der Bereinigung enthalten die 26 App-Tabellen 0 Datensätze. Anschließend wurde ein Foreign-Key-Check ausgeführt; es wurden keine Verletzungen gefunden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/data/taskmanager.sqlite` | geändert | App-Tabellen geleert, Migrationshistorie erhalten |
| `logs/2026-05-18-fix-app-datenbank-leeren.md` | neu | Log-Eintrag für den Datenbank-Reset |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Ein erster Node-Aufruf scheiterte vor der DB-Operation an PowerShell-Quoting. Der eigentliche Löschvorgang wurde danach erfolgreich per Inline-Skript ausgeführt.

## Offene Punkte / Folgeaufgaben

Keine.
