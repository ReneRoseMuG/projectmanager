# Log: Section & FormField

**Datum:** 17.05.26  
**Schritt:** 4 — Section-Card & FormField-Wrapper  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die gemeinsamen UI-Komponenten `Section` und `FormField` wurden angelegt. `Section` nutzt `SectionHeader` und `Divider` und ersetzt die lokalen `FormCard`-Wrapper sowie alle `cardClass`-Konstanten in `apps/web/src`. `FormField` bündelt `Label`, Control sowie optionale Hint-/Error-Ausgaben und wurde in den im Auftrag genannten Formularen für die alten Label-Wrapper eingesetzt. `Select` und `DatePicker` nutzen intern ebenfalls `FormField`. Die betroffenen Formulare und Editor-Panels wurden typisiert umgestellt, ohne neue Dateien außerhalb der UI-Komponenten und Logs anzulegen. Typcheck und Web-Build sind erfolgreich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Section.tsx` | neu | Einheitliche Section-Card mit Header, Divider und Actions-Slot |
| `apps/web/src/components/ui/FormField.tsx` | neu | Einheitlicher Label-/Hint-/Error-Wrapper |
| `apps/web/src/components/ui/DatePicker.tsx` | geändert | Intern auf `FormField` umgestellt |
| `apps/web/src/components/ui/Select.tsx` | geändert | Intern auf `FormField` umgestellt |
| `apps/web/src/components/features/FeatureDetail.tsx` | geändert | Lokale FormCard/Label-Struktur durch `Section` und `FormField` ersetzt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Lokale FormCard/Label-Struktur durch `Section` und `FormField` ersetzt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Details-Labels auf `FormField` umgestellt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Sections und Labels auf `Section`/`FormField` umgestellt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Sections und Labels auf `Section`/`FormField` umgestellt |
| `apps/web/src/components/backlog/BacklogItemForm.tsx` | geändert | Sections und Labels auf `Section`/`FormField` umgestellt |
| `apps/web/src/components/usecases/UseCaseDetail.tsx` | geändert | Lokale FormCard/Label-Struktur durch `Section` und `FormField` ersetzt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | Lokale FormCard/Label-Struktur durch `Section` und `FormField` ersetzt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Titel/Beschreibung auf `FormField` umgestellt |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | `cardClass` durch `Section` ersetzt |
| `apps/web/src/components/notes/NoteEditor.tsx` | geändert | `cardClass` durch `Section` ersetzt |
| `apps/web/src/components/tags/TagManager.tsx` | geändert | `cardClass` durch `Section` ersetzt |
| `logs/2026-05-17-schritt-04-section-formfield.md` | neu | Schritt-Log für Schritt 4 |
| `logs/README.md` | geändert | Log-Index um Schritt 4 ergänzt |

## Probleme und Abweichungen

Die Umstellung wurde auf vorhandene Form- und Panel-Strukturen angewendet, ohne das Layout grundsätzlich neu zu ordnen. Einige angrenzende Label-Muster außerhalb der im Auftrag genannten Formularliste bleiben fachlich unverändert; die expliziten Grep-Abnahmekriterien für `cardClass`/`FormCard` und den alten exakten Label-Wrapper sind erfüllt.

## Offene Punkte / Folgeaufgaben

Keine.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `rg -n -- "cardClass\|FormCard" apps/web/src` | ✅ Keine Treffer |
| `rg -n -- 'className="grid gap-1 text-sm font-' apps/web/src` | ✅ Keine Treffer |
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
| `npm run build -w apps/web` | ✅ Erfolgreich, mit bestehender Vite-Warnung zu großen Chunks |
