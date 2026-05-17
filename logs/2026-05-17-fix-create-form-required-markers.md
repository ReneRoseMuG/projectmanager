# Log: Create-Form Pflichtfeld-Markierungen

**Datum:** 17.05.26  
**Schritt:** Fix — Create-Form Pflichtfeld-Markierungen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die sichtbaren Pflichtfeld-Markierungen wurden aus den Formularen entfernt. Betroffen sind die Sternchen an Titel-, Slug- und vergleichbaren Feldern sowie der Hinweis `Pflichtfelder mit *` in der Feature-Detailansicht. Die technischen `required`-Attribute bleiben unverändert erhalten, damit die Browser- und Formularvalidierung weiterhin greift. Es wurden keine API-, Datenbank- oder Speicherlogikänderungen vorgenommen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Pflichtfeld-Stern am Titel entfernt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Pflichtfeld-Stern-Ausgabe in Labels entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Pflichtfeld-Stern-Ausgabe in Labels entfernt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Pflichtfeld-Stern am Titel entfernt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Pflichtfeld-Stern am Titel entfernt |
| `apps/web/src/components/usecases/UseCaseDetail.tsx` | geändert | Pflichtfeld-Stern-Ausgabe in Labels entfernt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Pflichtfeld-Stern-Ausgabe in Labels entfernt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Pflichtfeld-Stern am Titel entfernt |
| `apps/web/src/pages/FeatureDetailPage.tsx` | geändert | Hinweis `Pflichtfelder mit *` ersetzt |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
