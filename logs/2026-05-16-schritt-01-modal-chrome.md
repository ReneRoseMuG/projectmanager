# Log: Modal-Chrome

**Datum:** 16.05.26  
**Schritt:** 1 — Modal Chrome und Header  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das globale Modal wurde um einen dunkleren Scrim, Blur, größere Rundung und eine flexible Body-Konfiguration erweitert. Der Task-Detail-Dialog nutzt nun einen eigenen Header statt der Standard-Modalüberschrift. Der Header zeigt Breadcrumbs, Task-Code, Titel, Status/Priorität, Fälligkeitsdatum, Zuständigkeitsstub und die vorgesehenen Aktionsbuttons. Bestehende Standard-Modals behalten ihren Header und ihr Padding, damit bereits umgesetzte Formularflächen nicht regressieren.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/ui/Modal.tsx` | geändert | Modal-Chrome erweitert und konfigurierbaren Header/Body ergänzt |
| `apps/web/src/components/tasks/TaskDetail.tsx` | geändert | Neuer Task-Header mit Meta-Pills und Aktionsbuttons |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
