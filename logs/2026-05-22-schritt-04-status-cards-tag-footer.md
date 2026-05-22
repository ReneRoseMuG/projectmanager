# Log: Status-Cards und Tag-Footer

**Datum:** 22.05.26  
**Schritt:** 4 — Status-Cards und Tag-Footer  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die sichtbare Identity-UI wurde aus Projekt- und Meilensteinformularen entfernt, ohne das bestehende Schema oder bestehende Payload-Felder anzutasten. Cards und List Items beziehen ihre Akzentfarbe nun aus dem jeweiligen Statuskatalog statt aus separaten Identity-Farben. Tags werden in einem gemeinsamen Footer-Bereich dargestellt, damit Cards und Rows konsistenter aufgebaut sind. Die Basiskomponente misst sichtbare Items und setzt eine einheitliche Mindesthöhe, damit Cards und List Items innerhalb der aktuellen Ansicht gleich hoch bleiben.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/TagFooter.tsx` | neu | Einheitlichen Tag-Footer für Cards und Rows ergänzt |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Pre-Rendering-Messung für gleiche Item-Höhen ergänzt |
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Akzentfarbe aus Status und Tags im Footer umgesetzt |
| `apps/web/src/components/milestones/MilestoneCard.tsx` | geändert | Akzentfarbe aus Status und Tags im Footer umgesetzt |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Statusfarbe und Tag-Footer integriert |
| `apps/web/src/components/tickets/TicketCard.tsx` | geändert | Statusfarbe und Tag-Footer integriert |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | sichtbare Projekt-Identity-Felder aus der UI entfernt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | sichtbare Meilenstein-Identity-Felder aus der UI entfernt |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Row-Variante für einheitlichen List View ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine fachlichen offenen Punkte in diesem Schritt. Der nachgelagerte volle Testlauf enthält rote Tests, die im Abschlussbericht benannt sind.
