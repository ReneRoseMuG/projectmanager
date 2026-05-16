# Log: ProjectForm

**Datum:** 16.05.26  
**Schritt:** 1 — ProjectForm-Modal  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das ProjectForm-Modal nutzt nun `size="xl"` mit eigenem Steelblue-Header, Breadcrumbs, Icon, Statushinweis und Footer. Der Body ist in Sub-Cards für Stammdaten, Identität, Zeitrahmen und Tags gegliedert. Die Projektfarbe wird über Swatches plus Color-Picker gewählt, der Status über segmentierte Buttons. Pflichtfeldmarkierung, Footer-Hint und Speichern-/Abbrechen-Aktionen wurden an die Studie-2-Formensprache angepasst.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | ProjectForm auf Studie-2-Form-Chrome umgestellt |

## Probleme und Abweichungen

Kürzel, Start und Fällig sind UI-Kontextfelder ohne Persistenz, weil `ProjectInput` dafür aktuell keine Felder enthält und der Auftrag API- und DB-Verträge unverändert lässt.

## Offene Punkte / Folgeaufgaben

Persistente Projekt-Zeiträume und Projekt-Kürzel wären ein separater Schema-/API-Auftrag.
