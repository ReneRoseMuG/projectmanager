# Log: Formular schließen und Iconbuttons

**Datum:** 18.05.26  
**Schritt:** Fix — Formular schließen und Iconbuttons  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Task-Detaildialog schließt jetzt nach erfolgreichem Speichern, analog zu den bestehenden Formular-Modals. Die übrigen FormModal-basierten Formulare wurden geprüft; sie schließen bereits nach erfolgreichem Submit. Die kleinen Board-/Listen-Umschalter und die Editier-/Löschaktionen in Karten, Listenzeilen und relevanten Panels wurden auf eine einheitliche 40px-Zielgröße angehoben. Die Icongrößen wurden an diesen Stellen von 15–17px auf 18–20px erhöht. Damit entsprechen die Aktionsbuttons optisch dem Plus-Button und sind besser klickbar.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Task-Detailformular schließt nach erfolgreichem Speichern |
| `apps/web/src/components/ui/ViewToggle.tsx` | geändert | Board-/Listen-Umschalter vergrößert |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Spalten-Plus-Button im Board vergrößert |
| `apps/web/src/components/ui/ItemCard.tsx` | geändert | Standard-Edit-/Delete-Buttons in Karten vergrößert |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Row-Aktionsbuttons vergrößert |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Row-Aktionsbuttons vergrößert |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Row-Aktionsbuttons vergrößert |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Row-Aktionsbuttons vergrößert |
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | View-Umschalter und Edit-Aktionen vergrößert |
| `apps/web/src/components/tickets/TicketRelationPanel.tsx` | geändert | Relation-Löschbutton vergrößert |
| `apps/web/src/components/notes/NoteCard.tsx` | geändert | Notiz-Aktionsbuttons vergrößert |
| `apps/web/src/components/tasks/SubtaskList.tsx` | geändert | Task-Löschbutton vergrößert |
| `apps/web/src/components/ui/CommentThread.tsx` | geändert | Kommentar-Löschbutton vergrößert |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | Tag-Aktionsbuttons vergrößert |
| `apps/web/src/components/attachments/AttachmentPreview.tsx` | geändert | Attachment-Löschbutton vergrößert |
| `logs/2026-05-18-fix-formular-schliessen-und-iconbuttons.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. Kleine 32px-/36px-Elemente bleiben nur dort bestehen, wo sie keine Edit-/Delete- oder Board-/Listen-Aktion sind, etwa bei Schließen-Buttons, Farbswatches oder dekorativen Statussymbolen.

## Offene Punkte / Folgeaufgaben

Keine.
