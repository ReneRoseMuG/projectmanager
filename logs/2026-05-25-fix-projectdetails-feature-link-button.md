# Log: ProjectDetails Feature-Link-Button

**Datum:** 25.05.26  
**Schritt:** Fix — ProjectDetails Feature-Link-Button  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Features-Tab der ProjectDetails wurde der fehlende Button zum Verknüpfen bestehender Features ergänzt. Der Button nutzt die vorhandene FeatureLinkDialog-Komponente und schreibt bei gespeicherten Projekten über die bestehende Projekt-Feature-Link-Mutation. Für neue Projekte bleibt die bisherige Vormerklogik erhalten. Zusätzlich wurde die gemeinsame ListBoardView-Toolbar so angepasst, dass sekundäre Link-Aktionen direkt rechts neben dem Plus-Button angezeigt werden. Damit gilt die Positionierung auch für andere List-/Board-Flächen, die denselben Link-Button-Platz verwenden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Link-Button und Verknüpfungslogik im ProjectDetails-Features-Tab ergänzt |
| `apps/web/src/components/ui/ListBoardView.tsx` | geändert | Toolbar-Reihenfolge angepasst: Plus-Button vor sekundärer Link-Aktion |
| `logs/2026-05-25-fix-projectdetails-feature-link-button.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine funktionalen Abweichungen. Der Web-Build meldet weiterhin nur die bestehende Vite-Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
