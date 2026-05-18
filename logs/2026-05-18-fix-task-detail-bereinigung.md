# Log: Task-Detail Bereinigung

**Datum:** 18.05.26  
**Schritt:** Fix — Task-Detail Bereinigung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Task-Detaildialog wurde von nicht beauftragten und irreführenden UI-Elementen bereinigt. Der Breadcrumb zeigt jetzt den echten Aufgabentitel statt einer künstlichen `TASK-<id>`-Kennung, und der separate `TASK-<id>`-Chip wurde entfernt. Die generischen Header-Aktionen zum Link-Kopieren und für weitere Optionen wurden aus dem Detail-Modal entfernt. Das Feld `Zuständig` wurde aus Task-Detail und Task-Form entfernt; beim Speichern wird ein vorhandener Altwert auf `null` gesetzt. Die Beschreibung nutzt im Detailformular den Rich-Text-Editor statt eines Textareas, damit gespeichertes HTML nicht als Rohtext angezeigt wird. Der Aktivitätsbereich und die doppelte Subtask-Seitenleiste wurden entfernt; die vorhandene Aufgaben-Unterstruktur bleibt ausschließlich über den Tab sichtbar. Status und Priorität sind im Detailformular oben ausgerichtet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Breadcrumb, Header-Inhalte, Zuständig-Feld, Beschreibung, Aktivität und Seitenleiste bereinigt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Zuständig-Feld aus dem Aufgabenformular entfernt |
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Sichtbare Subtask-Bezeichnungen im Tab bereinigt |
| `apps/web/src/components/ui/DetailModal.tsx` | geändert | Link-Kopieren-Button und Drei-Punkt-Menü aus Detail-Header entfernt |
| `logs/2026-05-18-fix-task-detail-bereinigung.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Der vorherige Lintlauf fand einen TSX-Syntaxfehler aus der laufenden Bearbeitung; dieser wurde korrigiert und der erneute Lintlauf war erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
