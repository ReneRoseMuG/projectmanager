# Log: FeatureCard und FullCalendar

**Datum:** 16.05.26  
**Schritt:** 7 — FeatureCard und FullCalendar-Theme  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Feature-Karten wurden auf das neue kräftigere Kartenlayout mit `rounded-2xl`, Mindesthöhe, Top-Akzentstreifen und größerer Icon-Box umgestellt. Der Feature-Status wird nun als `Pill` angezeigt, der Use-Case-Zähler steht im Footer und der runde Pfeil-Button reagiert auf den Karten-Hover. Die Karte ist über einen Overlay-Link klickbar; der Delete-Button bleibt als eigene Aktion bedienbar. Im Kalender wurden die bisherigen Default-Farben durch eine zentrale Projekt-Akzentzuordnung ersetzt, Task-Fälligkeiten erhalten eine gestrichelte Darstellung. Die FullCalendar-Overrides wurden in `apps/web/src/styles.css` ergänzt, weil das Projekt keine `index.css` verwendet. Der Web-Build wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/FeatureCard.tsx` | geändert | Neues FeatureCard-Layout mit Pill, Akzent-Glow und Footer |
| `apps/web/src/components/calendar/CalendarView.tsx` | geändert | Projekt-Akzentfarben und Task-Due-Event-Klasse ergänzt |
| `apps/web/src/styles.css` | geändert | FullCalendar-CSS an Steelblue-Theme angepasst |

## Probleme und Abweichungen

Im Auftrag ist `apps/web/src/index.css` genannt; im Projekt existiert stattdessen `apps/web/src/styles.css`, das von `main.tsx` importiert wird. Die FullCalendar-Overrides wurden deshalb dort ergänzt. Die im Auftrag vorgeschlagene negative Zeichenweite für den Kalender-Titel wurde nicht übernommen, weil die UI-Regeln des Projekts negative Letter-Spacing-Werte verbieten. `Designstudie-2/` ist weiterhin nicht lokal verfügbar, daher konnte kein Browservergleich mit dem Mockup stattfinden. `npm run build -w apps/web` war erfolgreich, mit der bekannten Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdateien vorhanden sind.
