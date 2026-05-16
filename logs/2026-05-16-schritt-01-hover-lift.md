# Log: Hover-Lift

**Datum:** 16.05.26  
**Schritt:** 1 — Hover-Lift auf Karten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Projektkarten, Featurekarten und Taskkarten im Listenmodus erhalten nun beim Hover einen kleinen Lift und den bestehenden `shadow-panel`-Schatten. Die Änderung nutzt ausschließlich vorhandene Tailwind-Tokens und ergänzt keine neue Styling-Struktur. Bei `TaskCard` wird der Effekt über den vorhandenen `compact`-Prop gesteuert, sodass kompakte Kanban-Karten unverändert bleiben und Drag-Interaktionen nicht gestört werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Hover-Lift für Projektkarten ergänzt |
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Hover-Lift für Featurekarten ergänzt |
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Hover-Lift nur für nicht-kompakte Taskkarten ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
