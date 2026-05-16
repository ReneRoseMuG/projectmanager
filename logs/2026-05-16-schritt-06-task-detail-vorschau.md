# Log: Task-Detail Vorschau

**Datum:** 16.05.26  
**Schritt:** 6 — Subtask- und Kommentar-Vorschau im Details-Tab  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Details-Tab der Task-Detail-Ansicht werden nun unter dem Tag-Picker zwei kompakte Vorschau-Panels angezeigt. Das Subtask-Panel zeigt bis zu drei Subtasks mit Checkbox-Optik sowie den Zähler `erledigt / gesamt`; bei mehr als drei Einträgen wechselt `Alle anzeigen` auf den bestehenden Subtasks-Tab. Das Kommentar-Panel zeigt die zwei neuesten Kommentare und bietet mit `Alle Kommentare` einen Wechsel auf den Kommentare-Tab. Die Vorschau nutzt ausschließlich Daten aus `detail.task.subtasks` und `detail.task.comments`, es wurden keine neuen Datenabfragen ergänzt. Nach der Änderung wurde der Web-Build erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Subtask- und Kommentar-Vorschau im Details-Tab ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
