# Log: Wiki Tree Backend Persistenz

**Datum:** 29.06.26  
**Uhrzeit:** 06:40:40  
**Schritt:** 1 — Backend & Contracts  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Wiki-Seitenbaum-Zustand wurde als benutzerbezogenes Setting `wiki.treeState` in den Shared Types ergänzt. Das Setting speichert den Sidebar-Zustand und die eingeklappten Wiki-Seiten als validierten JSON-Wert im bestehenden USER-Scope. Zusätzlich wurde ein gemeinsamer Request-Typ für atomare Wiki-Tree-Moves angelegt. Serverseitig gibt es nun `POST /api/wiki/tree/move`, der Zielparent, vollständige Ziel-Geschwisterliste und erwartete Versionen prüft und alle Sortieränderungen in einer Transaktion speichert. Eine neue Datenbankmigration war nicht nötig, weil die vorhandene `settings_values`-Tabelle verwendet wird.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | `wiki.treeState` und `WikiTreeMoveRequest` ergänzt |
| `apps/api/src/services/wiki.service.ts` | geändert | Atomaren Wiki-Tree-Move mit Parent-, Sibling- und Versionsprüfung ergänzt |
| `apps/api/src/routes/wiki.ts` | geändert | Schreibroute `/api/wiki/tree/move` ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
