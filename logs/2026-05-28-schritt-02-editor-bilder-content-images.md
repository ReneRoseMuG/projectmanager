# Log: Editor-Bilder als Content Images

**Datum:** 28.05.26  
**Schritt:** 2 — HTML-Editor-Bilder als Content Images  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Alle editierbaren `RichTextInlineField`-Verwendungen erhalten jetzt einen `uploadContentImage`-Handler, sofern sie HTML-Inhalte bearbeiten. Damit werden Bilder aus HTML-Editoren über die bestehende Content-Image-Infrastruktur in der Datenbank gespeichert. Die bisherigen Sonderwege, bei denen Projekt-, Meilenstein-, Task- oder Feature-Beschreibungen Bilder als Attachments hochgeladen haben, wurden entfernt. Der Rich-Text-Editor blockiert Bild-Einfügen ohne Upload-Handler und bietet keinen freien Bild-URL-Dialog mehr an. Physische Uploads bleiben damit auf echte Attachment-Controls beschränkt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Bild-Einfügen nur noch über expliziten Upload-Handler erlaubt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Projektbeschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Meilensteinbeschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Task-Beschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Feature-Beschreibung und Inhalt nutzen Content-Image-Upload |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Feature-Detailfelder nutzen Content-Image-Upload |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Use-Case-Beschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Backlog-Beschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Kalenderbeschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Ticketbeschreibung nutzt Content-Image-Upload |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Notizeditor nutzt Content-Image-Upload |
| `apps/web/src/components/ui/CommentBodyModal.tsx` | geändert | Kommentar-Editor nutzt Content-Image-Upload |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Blockade ohne Upload-Handler und Upload-Pfad abgesichert |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Create-Modus erwartet aktivierte Content-Image-Uploads |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Create-Modus erwartet aktivierten Content-Image-Upload |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Create-Modus erwartet aktivierten Content-Image-Upload |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | Create-Modus erwartet aktivierten Content-Image-Upload |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Betroffen sind Web-Unit-Tests mit Komponenten-Mocks und TypeScript-Buildprüfungen. Bewiesen werden soll: Editierbare HTML-Felder können Bilder über `uploadContentImage` einfügen, während Felder ohne Handler keine Bilder über freie URL oder Clipboard-Sonderweg einbringen.
