# Log: ConfirmDialog

**Datum:** 16.05.26  
**Schritt:** 7 — ConfirmDialog  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Ein neuer ConfirmDialog mit Provider und `useConfirm()`-Hook wurde eingebaut. Die Severities `danger`, `warn` und `info` haben eigene Icon- und Button-Tones. Alle bisherigen `window.confirm`- und `alert`-Stellen im Frontend wurden geprüft und ersetzt. Dirty-Close-Bestätigungen wurden für NoteEditor und WikiEditor ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/ConfirmDialog.tsx` | neu | Dialog-UI und ConfirmPopover-Stub |
| `apps/web/src/components/ui/ConfirmDialogProvider.tsx` | neu | Globaler `confirm()`-Hook |
| `apps/web/src/main.tsx` | geändert | ConfirmDialogProvider global eingebunden |
| `apps/web/src/pages/*` | geändert | Löschbestätigungen auf `useConfirm()` umgestellt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Notiz-/Datei-Löschbestätigung umgestellt |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | Tag-Löschbestätigung umgestellt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | Dirty-Close-Bestätigung ergänzt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Dirty-Close-Bestätigung ergänzt |

## Probleme und Abweichungen

Keine. `rg "window\.confirm|\balert\(" apps/web/src` findet keine Treffer mehr.

## Offene Punkte / Folgeaufgaben

Keine.
