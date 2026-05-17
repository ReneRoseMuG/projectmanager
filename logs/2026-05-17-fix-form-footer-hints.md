# Log: Form-Footer-Hinweise

**Datum:** 17.05.26  
**Schritt:** Fix — Form-Footer-Hinweise  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Links ausgerichtete Hinweistexte in Formular-Footern wurden entfernt. Betroffen sind unter anderem Hinweise wie `Speichern ist nur im Details-Tab aktiv.`, Speicherstatus-Texte, Shortcut-Hinweise, Objekt-IDs und letzte Speicherzeitpunkte. Die eigentlichen Formularaktionen bleiben erhalten und werden rechts im Footer ausgerichtet. Es wurden keine Validierungen, Submit-Handler, Tabs oder API-Aufrufe geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Linken Footer-Hinweis entfernt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Linken Footer-Hinweis entfernt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Linken Speicherstatus im Footer entfernt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Leeren/letzten Speicherhinweis im Footer entfernt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Tab-abhängigen Footer-Hinweis entfernt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Shortcut-Hinweis im Footer entfernt |
| `apps/web/src/components/usecases/UseCaseDetail.tsx` | geändert | Linken Footer-Hinweis entfernt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Speicherhinweis im Footer entfernt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Veröffentlichungsstatus im Footer entfernt |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
