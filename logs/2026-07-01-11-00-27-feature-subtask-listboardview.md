# Log: Subtask ListBoardView

**Datum:** 01.07.26  
**Uhrzeit:** 11:00:27  
**Schritt:** Feature — Subtask ListBoardView  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die flache Checkbox-/Papierkorb-Liste für Unteraufgaben wurde durch den bestehenden `TaskListBoardView`-Adapter ersetzt. Unteraufgaben erscheinen dadurch als echte Aufgaben-Items mit Listen-/Board-Umschaltung, Statusgruppen, Suche, Statusänderung, Fälligkeitsänderung, Tag-Bearbeitung, Löschen und Öffnen. Neue Unteraufgaben werden nicht mehr über ein Inline-Titelfeld erzeugt, sondern über den vorhandenen Task-Draft-Dialog mit Status und Priorität; der Spalten-Add-Flow kann den Status vorbefüllen. Beim Öffnen einer Unteraufgabe navigiert die Task-Detailseite zur jeweiligen Aufgabe, während Modal-Kontexte auf einen Standalone-Tab ausweichen. Da das Backend Subtasks von Subtasks verbietet, wird der Subtask-Tab bei geöffneten Unteraufgaben ausgeblendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Checkbox-Liste durch `TaskListBoardView` im Detail-Wrapper ersetzt |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | `addLabel` und `emptyState` als optionale Overrides ergänzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Subtask-ViewMode, Dialog-Erstellung, Öffnen, Tags und Subtask-Tab-Gating verdrahtet |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Öffnen einer Unteraufgabe navigiert zur Task-Detailroute |
| `tests/unit/web/components/tasks/SubtaskList.test.tsx` | geändert | Unit-Test auf ListBoardView-Verdrahtung und `expectedVersion`-Statusupdate angepasst |

## Probleme und Abweichungen

Graphify konnte wegen `uv trampoline failed to canonicalize script path` nicht als Orientierung genutzt werden; die Analyse erfolgte danach gezielt über `rg` und die betroffenen Dateien. Ein erster Testaufruf war falsch syntaktisch zusammengesetzt und startete zu breit, wodurch er in Timeout/EPIPE lief; anschließend wurde der gezielte Web-Workspace-Test korrekt ausgeführt. Echtes Board-Reordering für Unteraufgaben wurde nicht umgesetzt, weil Unteraufgaben keine Owner-Boardposition besitzen und `updateOwnerTaskBoard` nur ownerverknüpfte Aufgaben unterstützt.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken und Verifikation

Der Testentwurfs-Skill wurde angewendet. Testebene: Unit/jsdom für die Subtask-Komponentenverdrahtung; echte Backend-Daten, DB und Dateisystem waren nicht betroffen. Verifiziert wurde mit:

- `npm run typecheck -w apps/web`
- `npm run test -- ..\..\tests\unit\web\components\tasks\SubtaskList.test.tsx` im Workspace `apps/web`
