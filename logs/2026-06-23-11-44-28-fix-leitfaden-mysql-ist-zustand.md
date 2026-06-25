# Log: Architektur-Leitfaden — MySQL als Ist-Zustand vermerkt

**Datum:** 23.06.26  
**Uhrzeit:** 11:44:28  
**Schritt:** Fix (Klasse 4 — Doku-Korrektur)  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Folgeauftrag aus dem `leitfaden-pflege`-Befund: Der Architektur-Leitfaden wies fälschlich SQLite als Datenbank aus, obwohl die App durchgängig MySQL nutzt (`drizzle-orm/mysql2`, Aiven Cloud; Integrationstests gegen dedizierte MySQL-Testdatenbank gemäß agents.md §11). Diese vorbestehende Drift wurde auf ausdrücklichen Wunsch korrigiert, sodass der Leitfaden den Ist-Zustand beschreibt.

Zwei Stellen geändert (minimal-invasiv, nur SQLite → MySQL):
- §4 Schichtarchitektur, Stack-Diagramm: `… → Drizzle ORM → SQLite` → `… → Drizzle ORM → MySQL`
- §7 Test-Regime: Überschrift `Integration-Tests (… echte SQLite-DB)` → `… echte MySQL-DB`

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `docs/architektur-leitfaden.md` | geändert | Stack (§4) und Integrationstest-DB (§7) von SQLite auf MySQL korrigiert |

## Probleme und Abweichungen

Keine. Ist-Zustand vor der Änderung verifiziert: `apps/api/src/db/client.ts` nutzt `mysql2`/Drizzle-MySQL; agents.md §11 belegt MySQL-Testdatenbanken. Keine weiteren SQLite-Erwähnungen im Architektur-Leitfaden (per Grep geprüft).

## Offene Punkte / Folgeaufgaben

- Nebenbeobachtung (nicht geändert): In `apps/api/.env` existiert noch eine ungenutzte `DATABASE_PATH=./data/taskmanager.sqlite`-Zeile (Altlast; die DB-Verbindung läuft über `DB_HOST` etc.). Bereinigung nur auf Auftrag.
