# Log: Project Feature Status-Akzentfarben

**Datum:** 24.05.26  
**Schritt:** Fix — Project Feature Status-Akzentfarben  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Akzentfarbe der Feature-Karten im Project Details Tab `Features` wird nun aus dem Feature-Status abgeleitet. Dafür nutzt der Tab dieselbe Kataloglogik wie die Feature-Hauptansicht: `useCatalogs` liefert die Katalogeinträge, `catalogColor` ermittelt daraus die Farbe für `featureStatus`. Die Änderung gilt sowohl für Board-Karten als auch für Listenzeilen im Projekt-Feature-Panel. Datenmodell, API, Berechtigungen und Query-Verhalten wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/features/ProjectFeaturePanel.tsx` | geändert | Akzentfarbe von Feature-Karten und -Zeilen an Statusfarbe gekoppelt |
| `logs/2026-05-24-fix-project-feature-status-akzentfarben.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzt |

## Probleme und Abweichungen

Der Arbeitsbaum enthielt bereits vor Beginn viele uncommitted Änderungen, auch in `ProjectFeaturePanel.tsx`. Bearbeitet wurde nur die angeforderte Akzentfarb-Logik. Der Web-Build wurde mit `npm run build -w apps/web` erfolgreich ausgeführt; Vite meldete lediglich die bestehende Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
