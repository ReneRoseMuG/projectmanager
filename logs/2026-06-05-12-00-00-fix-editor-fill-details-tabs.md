# Log: Editor Fill — Details Tabs

**Datum:** 05.06.26  
**Uhrzeit:** 12:00:00  
**Schritt:** Fix — HTML-Editoren füllen Details-Tab  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die `RichTextInlineField`-Komponente in den Details-Tabs von Projekt, Meilenstein, Aufgabe und Ticket haben den verfügbaren Platz nicht ausgenutzt. Der Editor blieb auf die `minRows`-Höhe beschränkt, statt sich über die gesamte Tab-Fläche zu erstrecken.

**Ursache:** Die Flex-Fill-Kette war unterbrochen. `overflow-auto` auf dem Content-Div verhindert Flex-Wachstum, und ohne `flex-1 min-h-0` entlang aller verschachtelten Divs kann `fill` in `RichTextInlineField` nicht wirken.

**Lösung:** In allen vier Formularen (Project, Milestone, Task, Ticket) den Details-Tab-Inhaltsbereich auf vollständige Flex-Fill-Kette umgestellt:
- Content-Div: `overflow-auto` → `flex flex-col overflow-hidden`
- Inner wrapper: `grid w-full gap-4` → `flex min-h-0 flex-1 flex-col gap-4 w-full`
- `Section`: `className="flex min-h-0 flex-1 flex-col"` (manuell, nicht via `fill`-Prop um Border-Styling zu erhalten)
- Inner div um die FormFields: `flex min-h-0 flex-1 flex-col gap-4`
- `FormField` Beschreibung: `fill` prop
- `RichTextInlineField`: `fill` prop

Bei `TaskForm` und `TicketForm` existierte die Flex-Fill-Kette bereits konditionell für `variant === "page"`. Diese Kondition wurde entfernt — Fill gilt nun für beide Varianten (page und modal).

## Geänderte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Flex-Fill-Kette für Details-Tab |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | Flex-Fill-Kette für Details-Tab |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | variant-Kondition entfernt, Fill immer aktiv |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | variant-Kondition entfernt, Fill immer aktiv |

## Probleme und Abweichungen

Keine. TypeScript-Check ohne Fehler.
