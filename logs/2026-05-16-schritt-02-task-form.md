# Log: TaskForm

**Datum:** 16.05.26  
**Schritt:** 2 — TaskForm-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das TaskForm-Modal wurde auf den XL-Form-Chrome mit Steelblue-Header, Breadcrumbs, Header-Actions und Footer umgestellt. Titel, Beschreibung, Status, Priorität, Zuständigkeit und Fälligkeitsdatum liegen nun in klar getrennten Sub-Cards. Status und Priorität werden als segmentierte Buttons dargestellt. Die Feature-Bezug-Zeile ist als Linked-Pattern vorbereitet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | TaskForm auf Studie-2-Form-Chrome umgestellt |

## Probleme und Abweichungen

Die Feature-Zuordnung und Tags werden im aktuellen Task-Erstellformular nicht persistiert, weil `TaskInput` und der bestehende Aufrufer dafür keine Datenübergabe haben. Die UI verweist deshalb sauber auf das Task-Detail.

## Offene Punkte / Folgeaufgaben

Feature- und Tag-Bindings direkt im TaskForm wären ein separater Datenfluss-Auftrag.
