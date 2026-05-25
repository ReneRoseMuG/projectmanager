# Log: Detail-Tabs Events und Import

**Datum:** 25.05.26  
**Schritt:** Fix  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Im Meilenstein-Detailformular wurde der Tab `Events` aus der Tab-Konfiguration entfernt. Der zugehörige, nicht mehr erreichbare Event-Tab-Inhalt samt lokalen Event-Hooks, Event-Formular und Event-Liste wurde aus `MilestoneForm` entfernt. Im Projekt-Detailformular wurde der Tab `Import` aus der Tab-Konfiguration entfernt. Der zugehörige Import-Tab-Inhalt samt lokalem Wiki-Import-Hook und Import-Handlern wurde aus `ProjectForm` entfernt.

Für die Teständerungen wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Abgedeckte Testebenen sind Web-Unit-Tests mit bestehenden Komponenten-Fixtures sowie ein Browser/E2E-Test mit echter Playwright-App, echter API und isolierten Laufzeitdaten unter `tests/.runtime`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | `Events`-Tab und zugehörigen Event-Tab-Code entfernt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | `Import`-Tab und zugehörigen Wiki-Import-Tab-Code entfernt |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Erwartung ergänzt, dass `Events` nicht mehr als Tab erscheint |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Erwartung im Edit-Modus auf fehlenden `Import`-Tab angepasst |
| `tests/browser/web/milestone.spec.ts` | geändert | Meilenstein-E2E erwartet keinen `Events`-Tab mehr |
| `logs/2026-05-25-fix-detail-tabs-events-import.md` | neu | Schritt-Log für diesen Fix |

## Probleme und Abweichungen

Keine. Die Playwright-Ausführung gab bestehende React-Router-Future-Warnings und TipTap-Duplicate-Extension-Warnings aus; alle ausgeführten Tests waren grün.

## Offene Punkte / Folgeaufgaben

Keine.
