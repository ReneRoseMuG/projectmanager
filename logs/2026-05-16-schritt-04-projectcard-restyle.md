# Log: ProjectCard-Restyle

**Datum:** 16.05.26  
**Schritt:** 4 — ProjectCard restylen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Projektkarten wurden auf das neue Kartenformat mit `rounded-2xl`, höherer Mindesthöhe, Top-Akzentstreifen und stärkerem Hover-Lift umgestellt. Die Icon-Box nutzt jetzt 48 Pixel Kantenlänge, Rundung und einen farbigen Glow aus der Projektfarbe. Der Status wird als gefüllte `Pill` dargestellt, die gesamte Karte ist über einen unsichtbaren Link klickbar, und die Edit-/Delete-Aktionen bleiben als eigene Buttons bedienbar. Der alte Öffnen-Button wurde durch einen Footer mit statischem Avatar-Stack und Offen-Zähler ersetzt. Der Web-Build wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectCard.tsx` | geändert | Karte auf neues Layout, Akzentstreifen, Pill-Status und Footer umgestellt |
| `apps/web/src/components/ui/Pill.tsx` | neu | Kleine Pill-Komponente mit vorgegebenen Tones angelegt |

## Probleme und Abweichungen

Die `Pill`-Komponente wurde bereits in Schritt 4 angelegt, weil die Projektkarte sie laut Schrittbeschreibung direkt benötigt, die formale Anlage aber erst in Schritt 6 beschrieben ist. `Designstudie-2/` ist weiterhin nicht lokal verfügbar, daher konnte kein Browservergleich mit dem Mockup stattfinden. `npm run build -w apps/web` war erfolgreich, mit der bekannten Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

In Schritt 6 wird `Pill` erneut gegen die TaskCard-Anforderungen geprüft und zusammen mit `Badge` weiterverwendet.
