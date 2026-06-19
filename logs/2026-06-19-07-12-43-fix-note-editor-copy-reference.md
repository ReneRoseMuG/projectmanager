# Log: Note-Editor Copy-Reference-Button

**Datum:** 19.06.26  
**Uhrzeit:** 07:12:43  
**Schritt:** Fix — TKT-NEU Note-Editor: fehlendes Copy-ID-Icon  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`NoteEditor` erhielt das neue optionale Prop `objectReference?: string`, das an `FormModal` weitergereicht wird. `FormModal` übergibt es bereits an `DetailHeaderActions`, welche bei gesetztem Wert `CopyReferenceButton` rendert. Im Create-Modus wird `objectReference` explizit auf `undefined` gesetzt — identisch zum Verhalten von `onOpenInTab`. Alle 8 Aufrufstellen wurden auf das Muster `objectReference={note ? objectReference("note", note.id) : undefined}` aktualisiert; `NoteDetailPage` und `DayPlanPage` erhielten zusätzlich den fehlenden Import aus `lib/references`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | `objectReference` zu Props + FormModal-Übergabe |
| `apps/web/src/pages/NoteDetailPage.tsx` | geändert | Import + `objectReference` Prop |
| `apps/web/src/pages/DayPlanPage.tsx` | geändert | Import + `objectReference` Prop |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | `objectReference` Prop |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | `objectReference` Prop |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | `objectReference` Prop |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | `objectReference` Prop |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | `objectReference` Prop |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | `objectReference` Prop (2 Instanzen) |
| `tests/unit/web/components/notes/NoteEditor.test.tsx` | geändert | 2 neue Tests: Edit-Mode zeigt Button, Create-Mode nicht |

## Probleme und Abweichungen

2 vorher schon rote Tests in `NoteEditor.test.tsx` (`übergibt Legacy-Markdown roh an RichTextInlineField`, `bewahrt Legacy-Markdown beim Speichern ohne Editor-Konvertierung`) — nicht durch diese Änderung verursacht, betreffen Markdown-Serialisierungslogik. Meine 2 neuen Tests ✓ grün, alle anderen 7 bestehenden Tests (soweit nicht bereits rot) ✓ grün.

## Offene Punkte / Folgeaufgaben

Vorhandene Legacy-Markdown-Regression (2 rote Tests) als separaten Auftrag klären.
