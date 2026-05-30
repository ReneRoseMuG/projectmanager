# Log: Sidebar Header Buttons

**Datum:** 24.05.26  
**Schritt:** Fix — Sidebar Header Buttons  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Sidebar-Header wurde nachjustiert. Die beiden Icon-Buttons für Einklappen und Aktualisieren stehen nun direkt rechts neben dem PM-Icon in der obersten Zeile. Die Titelzeile „Projekt Manager“ bleibt darunter als eigene Zeile, und die globale Suche folgt weiterhin unterhalb des Titels. Die vorhandenen Funktionen der beiden Buttons wurden unverändert beibehalten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Collapse- und Update-Buttons in die PM-Icon-Zeile verschoben |
| `logs/2026-05-24-fix-sidebar-header-buttons.md` | neu | Schritt-Log für die Header-Korrektur |
| `logs/README.md` | geändert | Log-Index um die Header-Korrektur ergänzt |

## Probleme und Abweichungen

Keine. Der Web-Build war erfolgreich; Vite meldete nur die bestehende Chunk-Größen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
