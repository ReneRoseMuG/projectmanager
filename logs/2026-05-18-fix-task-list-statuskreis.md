# Log: Task-Liste Statuskreis

**Datum:** 18.05.26  
**Schritt:** Fix — Task-Liste Statuskreis  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der runde Statuskreis wurde aus der Aufgaben-Listendarstellung entfernt. Die Aufgabe zeigt ihren Status weiterhin über die vorhandene Status-Pill an. Zusätzlich rendert `ItemRow` die optionale Status-Spalte nur noch, wenn tatsächlich ein `statusIndicator` übergeben wurde. Dadurch bleibt in der Aufgabenliste kein leerer Abstand an der Stelle des entfernten Kreises stehen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Statuskreis aus der Task-Row entfernt |
| `apps/web/src/components/ui/ItemRow.tsx` | geändert | Optionale Status-Indikator-Spalte nur bei vorhandenem Inhalt rendern |
| `logs/2026-05-18-fix-task-list-statuskreis.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
