# Log: Kanban-Tönung

**Datum:** 16.05.26  
**Schritt:** 5 — Kanban-Spalten tönen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Kanban-Spalten erhalten nun je Status eine dezente Hintergrund- und Border-Tönung aus der neuen Accent-Palette. Im Header wurde links neben dem Spaltentitel ein farbiger Bullet ergänzt, damit die Statuszuordnung schneller erfassbar ist. Die Aufgabenanzahl wird als weiße Count-Pill mit kleinem Schatten dargestellt. Die Sortable- und Droppable-Logik blieb unverändert. Der Web-Build wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/KanbanColumn.tsx` | geändert | Status-Tönung, Header-Bullet und Count-Pill ergänzt |

## Probleme und Abweichungen

`Designstudie-2/` ist weiterhin nicht lokal verfügbar, daher konnte kein Browservergleich mit dem Mockup stattfinden. `npm run build -w apps/web` war erfolgreich, mit der bekannten Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdateien vorhanden sind.
