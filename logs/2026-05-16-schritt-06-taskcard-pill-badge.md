# Log: TaskCard, Pill und Badge

**Datum:** 16.05.26  
**Schritt:** 6 — TaskCard, Pill und Tag  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

`Badge` wurde um die neue `tone`-Prop erweitert und bleibt dabei mit `muted` und `color` rückwärtskompatibel. Die bereits in Schritt 4 angelegte `Pill`-Komponente wurde gegen die vorgegebene API geprüft und unverändert weiterverwendet. Aufgabenkarten zeigen nun oben einen farbigen Prioritätsstrich, Status als gefüllte `Pill` und Priorität als getönte `Badge`. Subtask- und Due-Date-Metadaten wurden in einen kompakteren Footer mit Trennlinie verschoben. Tags in der TaskCard werden nun über die neue Tone-Variante von `Badge` gerendert. Der Web-Build wurde nach dem Schritt erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tasks/TaskCard.tsx` | geändert | Priority-Strich, Pill-Status, getönte Priority-Badge und kompakter Footer |
| `apps/web/src/components/ui/Badge.tsx` | geändert | `tone`-Prop ergänzt, bestehende Props kompatibel gelassen |
| `apps/web/src/components/ui/Pill.tsx` | geprüft | In Schritt 4 angelegte Pill für TaskCard wiederverwendet |

## Probleme und Abweichungen

Die `Pill`-Datei wurde wegen der Abhängigkeit aus Schritt 4 früher angelegt, entspricht aber der Vorgabe aus Schritt 6. `Designstudie-2/` ist weiterhin nicht lokal verfügbar, daher konnte kein Browservergleich mit dem Mockup stattfinden. `npm run build -w apps/web` war erfolgreich, mit der bekannten Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Visuellen Abgleich nachholen, sobald die Referenzdateien vorhanden sind.
