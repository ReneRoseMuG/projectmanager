# Log: Projektformular Feature-Vorauswahl

**Datum:** 18.05.26  
**Schritt:** Fix — Projektformular Feature-Vorauswahl  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die unbeauftragte Feature-Vorauswahl wurde aus dem Projektformular entfernt. `ProjectForm` rendert im Create- und Edit-Modus keine `Features`-Section und kein `FeatureRelationPanel` mehr. Der zugehörige Feature-State, die `initialFeatureIds`-Prop und der dritte Submit-Parameter wurden entfernt. In `ProjectsPage` wurde der Feature-Lade- und Speicherpfad für das Projektformular entfernt, sodass Projekt-Erstellen und Projekt-Bearbeiten nur noch Projektstammdaten und Tags speichern. Die bestehende Feature-Verknüpfung in der Projektdetailseite wurde nicht verändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Feature-Vorauswahl aus dem Projektformular entfernt |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Feature-Relationen aus dem Formular-Submit entfernt |
| `logs/2026-05-18-fix-projektformular-feature-vorauswahl.md` | neu | Log-Eintrag für den UI-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Eintrag ergänzt |

## Probleme und Abweichungen

Keine. `npm run build -w apps/web` wurde erfolgreich ausgeführt; Vite meldet weiterhin nur die bekannte Warnung zu großen Chunks.

## Offene Punkte / Folgeaufgaben

Keine.
