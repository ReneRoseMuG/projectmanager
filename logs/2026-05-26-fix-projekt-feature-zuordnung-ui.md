# Log: Projekt Feature Zuordnung UI

**Datum:** 26.05.26  
**Schritt:** Fix — Projekt Feature Zuordnung UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

In den Projektdetails wurde im Tab `Features` der Button zum Verknüpfen bestehender Features entfernt. Das Anlegen neuer Features aus einem Projekt heraus bleibt erhalten, damit die Oberfläche weiterhin wie eine Projekt-zu-Features-Beziehung wirkt. In den Feature-Details wurde der Tab `Projekte` vollständig aus der Tab-Leiste entfernt. Die zugehörige Projekt-Panel- und Dialoglogik im Feature-Formular wurde entfernt, da sie über die UI nicht mehr erreichbar sein soll. API, Datenmodell, Berechtigungen und bestehende Projekt-Feature-Relationen wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Link-Button im Features-Tab gespeicherter Projekte entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Projekte-Tab und zugehörige Panel-/Dialoglogik entfernt |
| `logs/2026-05-26-fix-projekt-feature-zuordnung-ui.md` | neu | Schritt-Log für den UI-Aufräum-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. `npm run build -w apps/web` läuft erfolgreich durch; Vite meldet nur Hinweise zu Plugin-Zeiten und die bekannte Chunkgrößen-Warnung.

## Offene Punkte / Folgeaufgaben

Keine.
