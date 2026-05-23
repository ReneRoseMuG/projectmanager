# Log: TipTap-Editor-Verbesserungen

**Datum:** 23.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der zentrale `RichTextInlineField` wurde um Sticky-Toolbar, Paste-Normalisierung und optionalen Bild-Upload erweitert. Der Editor-Container nutzt jetzt `overflow-clip`, damit die Toolbar mit `sticky top-0 z-10` im sichtbaren Bereich bleiben kann. Beim Einfügen von Text werden überzählige Leerzeilen reduziert; nach Paste-Transaktionen werden geerbte `color`- und `textStyle`-Marks entfernt. Für Bild-Pastes und den Bild-Toolbar-Button gibt es nun ein optionales `onImageUpload`-Prop, inklusive Upload-Platzhalter, deaktiviertem Upload-Button während laufender Uploads und URL-Prompt-Fallback ohne Upload-Kontext. Task-, Feature-, Project- und Milestone-Formulare übergeben das Prop im Edit-Modus über die vorhandenen Attachment-Mutations; Create-Modi bleiben ohne Bild-Upload. Unit-Tests und ein Browser-Test wurden ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Sticky-Toolbar, Paste-Bereinigung und optionaler Bild-Upload ergänzt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Editor-Bild-Upload im Task-Edit-Modus über Attachments verdrahtet |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Editor-Bild-Upload im Feature-Edit-Modus für Kurzbeschreibung und Inhalt verdrahtet |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Editor-Bild-Upload im Project-Edit-Modus verdrahtet |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Editor-Bild-Upload im Milestone-Edit-Modus verdrahtet |
| `tests/unit/web/components/ui/rich-text-inline-field.test.tsx` | geändert | Tests für Toolbar-Klassen, Paste-Normalisierung, Paste-Cleanup, Bild-Paste und URL-Fallback ergänzt |
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | RichText-Mock bildet `onImageUpload` für Formular-Tests ab |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | Edit-/Create-Modus für Task-Editor-Bild-Upload geprüft |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Edit-/Create-Modus für Feature-Editor-Bild-Upload geprüft |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Edit-/Create-Modus für Project-Editor-Bild-Upload geprüft |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Edit-/Create-Modus für Milestone-Editor-Bild-Upload geprüft |
| `tests/browser/web/task.spec.ts` | geändert | Browser-Test für Bild-Button-Upload im Task-Editor ergänzt |
| `logs/2026-05-23-feature-tiptap-editor-verbesserungen.md` | neu | Schritt-Log für diese Umsetzung |
| `logs/README.md` | geändert | Log-Index um diese Umsetzung ergänzt |

## Probleme und Abweichungen

`FeatureDetail.tsx` wurde nicht geändert, weil die aktive Feature-Detailroute laut Code über `FeatureForm` läuft und der bestätigte Plan diese Datei nur bei weiterer aktiver Nutzung anfassen wollte. `TicketForm.tsx` wurde nicht geändert, weil die Aufgabendatei Tickets unter den Nicht-Zielen nennt und der bestätigte Plan diesen Widerspruch so aufgelöst hat. Der Paste-Cleanup nutzt wie in der Aufgabendatei beschrieben die aggressive Variante und entfernt Farb-/TextStyle-Marks im gesamten Dokument nach Paste-Transaktionen. Im Arbeitsbaum waren bereits vor dieser Umsetzung mehrere gelöschte Dateien unter `docs/tasks/` sowie später eine ungetrackte Datei `codex-auftrag-eventbus-sse.md` vorhanden; diese bestehenden Änderungen wurden nicht angefasst.

## Offene Punkte / Folgeaufgaben

Die neu ergänzten Unit- und Browser-Tests wurden noch nicht als Testlauf ausgeführt. Verifiziert wurden `npm run typecheck -w apps/web` und `git diff --check`; letzteres meldete nur Zeilenendungswarnungen.
