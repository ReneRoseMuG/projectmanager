# Log: Dashboard-Notizkarten bearbeitbar, Löschen bei Aufgaben

**Datum:** 18.06.26  
**Uhrzeit:** 16:14:28  
**Schritt:** Fix — Persönliche Planung / Dashboard: Notizkarten editierbar machen, Löschen bei Aufgaben ergänzen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Dashboard der Persönlichen Planung (Tab „Übersicht", `DashboardView context="dayPlan"`) waren die Notizkarten nicht editierbar: Das `noteList`-Widget rendert über `NoteRows` ein rein statisches `<div>` ohne Doppelklick, Menü oder Aktionen. Die Aufgabenkarten desselben Dashboards hatten ein Menü mit „ID kopieren" und „Bearbeiten", aber kein „Löschen" (readOnly-Modus).

Umgesetzt:
- `NoteRows` um optionale `onEdit`/`onDelete`-Handler erweitert. Mit Handlern: Doppelklick auf die Karte öffnet den Editor, plus ein `ActionMenu` mit „ID kopieren" (über `objectReference`), „Bearbeiten" und „Löschen". Ohne Handler bleibt die Karte read-only wie bisher (andere Kontexte unverändert).
- Neue Wrapper-Komponente `DayPlanNoteListWidget` (analog zum bestehenden `DayPlanTaskBoardWidget`): hält `useNotes(owner)` für Update/Remove, den `NoteEditor` und die Permissions `notes:write`/`notes:delete`. Nur im DayPlan-Kontext aktiv.
- Aufgaben: `DayPlanTaskBoardWidget` löst Aufgaben jetzt über `useDayPlanTasks().unlinkTask` aus dem Plan (konsistent mit dem Aufgaben-Tab); `TaskBoardWidget` bekam einen optionalen `onDelete`-Prop.
- `TaskListBoardView` bekam den gezielten Prop `allowDeleteInReadOnly`, damit „Löschen" im read-only-Widget erscheint, sobald ein echter `onDelete` greift — exakt nach dem Muster, mit dem dort bereits `onStatusChange` aus der readOnly-Kopplung gelöst wurde. Default `false`, alle anderen Nutzer der Komponente bleiben unverändert.

Löschsemantik: „Löschen" bedeutet hier „aus der Persönlichen Planung lösen" (unlink), nicht endgültig löschen — konsistent mit den bestehenden Tabs (Toast „… aus Persönlicher Planung gelöst").

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | `NoteRows` interaktiv; `DayPlanNoteListWidget` neu; `DayPlanTaskBoardWidget`/`TaskBoardWidget` um Delete erweitert; `noteList`-Widgetauswahl im DayPlan-Kontext |
| `apps/web/src/components/tasks/TaskListBoardView.tsx` | geändert | Neuer optionaler Prop `allowDeleteInReadOnly` zum Anzeigen von „Löschen" in read-only-Widgets |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | `useDayPlanTasks`-/`removeNote`-Mocks ergänzt; read-only-Test verschärft; 4 neue Tests (Doppelklick-Edit, Notiz-Löschen, Aufgabe-Löschen, Projekt-Kontext kein Löschen) |

## Probleme und Abweichungen

- **Testleitplanken angewendet** (`test-entwurfsleitplanken`): Ebene Unit (vitest + Testing Library). Bewiesenes Verhalten: Doppelklick öffnet Editor; Menü-„Löschen" ruft `removeNote(noteId)` bzw. `unlinkTask(taskId)`; im Projekt-Kontext erscheint kein „Löschen". Isolation: gehoistete Mocks, keine echte DB/FS.
- **Verifikation:** `tsc` grün, ESLint (geänderte Dateien) grün. Gezielter Lauf von `DashboardWidgets.test.tsx`: 39 grün, +4 neue Tests. Voller `apps/web`-Lauf gegen Baseline verglichen (git stash): **keine neuen Fehler** durch diese Änderung.
- **Vorbestehender, unabhängiger Blocker (nicht von dieser Änderung):** 30 Unit-Tests waren bereits vor dem Eingriff rot (u. a. diverse `*ListBoardView`-Board-Layout-Tests, Form-Layout-Tests und `DashboardWidgets > filtert das Kalender-Widget im DayPlan-Kalender …`). Letzterer scheitert, weil der `useDayPlan`-Mock kein `useDayPlanEvents` bereitstellt und der DayPlan-Kalender keine gefilterten Event-Daten erhält. Nicht Teil dieses Auftrags, daher gemäß agents.md §4.2/§4.3 nicht eigenmächtig gefixt.
- **Parallele Session:** `apps/web/src/components/wiki/WikiTree.tsx` ist uncommittet durch eine parallel laufende Session geändert. Bewusst nicht angefasst und nicht in diesen Auftrag einbezogen. Beim Speichern dürfen nur die drei oben genannten Dateien gestaged werden.

## Offene Punkte / Folgeaufgaben

- Vorbestehende rote Unit-Tests separat adressieren (eigener Auftrag), insbesondere der `useDayPlanEvents`-Mock im DayPlan-Kalender-Test.
- `graphify update .` wurde bewusst noch nicht ausgeführt, da parallel weitere Code-Änderungen laufen — sinnvollerweise erst, wenn beide Sessions abgeschlossen sind.
