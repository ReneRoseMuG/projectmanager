# Log: Project Features Tab Position

**Datum:** 24.05.26  
**Schritt:** Fix — Project Features Tab Position  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Tab-Reihenfolge im Projekt-Detailformular wurde angepasst. Der bestehende Tab `Features` steht nun unmittelbar rechts neben `Tickets`. Es wurde nur die Reihenfolge im vorhandenen `baseTabs`-Array geändert, damit Tab-Zähler, Berechtigungen, Inhalte und Formularlogik unverändert bleiben. Der Web-Build wurde mit `npm run build -w apps/web` ausgeführt und war erfolgreich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Reihenfolge der ProjectForm-Tabs angepasst |
| `logs/2026-05-24-fix-project-features-tab-position.md` | neu | Schritt-Log für den Fix |
| `logs/README.md` | geändert | Log-Index um den Fix ergänzt |

## Probleme und Abweichungen

Der Arbeitsbaum enthielt bereits vor Beginn viele uncommitted Änderungen, auch in `ProjectForm.tsx`. Bearbeitet wurde ausschließlich die angeforderte Tab-Reihenfolge.

## Offene Punkte / Folgeaufgaben

Keine.
