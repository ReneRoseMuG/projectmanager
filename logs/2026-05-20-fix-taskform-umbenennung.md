# Log: TaskForm-Umbenennung

**Datum:** 20.05.26  
**Schritt:** Fix — TaskModal in TaskForm umbenennen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Aufgaben-Formular-Komponente wurde von `TaskModal` in `TaskForm` umbenannt. Dazu wurden Datei, exportierte Komponente, Props-, Input- und Tab-Typen sowie die Verwendung in der Task-Detailseite angepasst. Der zugehörige Komponententest wurde ebenfalls auf `TaskForm` umbenannt und alle JSX-Verwendungen wurden aktualisiert. Ein Referenzkommentar im Rich-Text-Feld wurde auf den neuen Dateinamen gebracht. Das bestehende Verhalten mit `variant="modal" | "page"` blieb unverändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskForm.tsx` | umbenannt/geändert | Aufgabenformular von `TaskModal` auf `TaskForm` umgestellt |
| `apps/web/src/components/tasks/__tests__/TaskForm.test.tsx` | umbenannt/geändert | Tests auf neuen Komponentennamen angepasst |
| `apps/web/src/pages/TaskDetailPage.tsx` | geändert | Import, Input-Typ und JSX-Verwendung auf `TaskForm` geändert |
| `apps/web/src/components/ui/rich-text-inline-field.tsx` | geändert | Referenzkommentar auf `TaskForm.tsx` aktualisiert |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine. `npm run typecheck -w apps/web` wurde ausgeführt und war erfolgreich.

## Offene Punkte / Folgeaufgaben

Die angekündigte Vereinheitlichung der verschiedenen Statusinformationen und Enums bleibt als separater Folgeauftrag offen.
