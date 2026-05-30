# Log: Features Projektfilter

**Datum:** 26.05.26  
**Schritt:** Fix — Features Projektfilter  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Auf der Features-Übersicht wurde ein Projektfilter ergänzt. Die Seite lädt dafür die vorhandene Projektliste und nutzt die bestehenden Projekt-Feature-Verknüpfungen über TanStack Query. Der neue Select-Filter arbeitet zusammen mit dem vorhandenen Statusfilter, sodass die Liste nur Features des gewählten Projekts und Status zeigt. Beim Laden der Projektverknüpfungen bleibt die bestehende Skeleton-Anzeige aktiv, damit keine leere Ergebnisliste aufflackert. API, Datenbank, Berechtigungen und Navigation wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/pages/FeaturesPage.tsx` | geändert | Projektfilter und kombinierte Status-/Projektfilterung ergänzt |
| `logs/2026-05-26-fix-features-projektfilter.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Der erste Web-Build fand einen Typfehler, weil Projekte im Shared Type `name` statt `title` verwenden. Der Select wurde auf `project.name` korrigiert; danach lief der Build erfolgreich durch. Die Testentwurfsleitplanken wurden für die statische Web-Prüfung angewendet; es wurden keine neuen Testdateien angelegt.

## Offene Punkte / Folgeaufgaben

Keine.
