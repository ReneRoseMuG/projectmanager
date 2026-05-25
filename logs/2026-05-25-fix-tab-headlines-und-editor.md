# Log: Tab-Headlines und Editor

**Datum:** 25.05.26  
**Schritt:** Fix / Feature  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die sichtbaren Tab-Labels `Stammdaten` wurden in den betroffenen Tab-Views auf `Details` vereinheitlicht. Redundante erste Abschnittsüberschriften direkt unter der TabBar wurden aus den Formular-Tabs entfernt, damit Tabs wie `Aufgaben`, `Tickets`, `Kommentare`, `Dateien` oder `Journal` nicht unmittelbar dieselbe Headline wiederholen. Dashboard-Übersicht-Tabs rendern keine eigene Inline-Headline mehr; stattdessen steht oben rechts ein sichtbarer Button `Tab-Editor`. Die Dashboard-Bearbeitung bleibt berechtigungsgesteuert und öffnet bei vorhandenen Dashboards den Editorbereich, bei leerem Dashboard-Zustand direkt den Editor zum Anlegen.

Für die Teständerungen wurden die Projekt-Manager-Testentwurfsleitplanken angewendet. Abgedeckte Testebenen sind Web-Unit-Tests mit bestehenden Komponenten-Fixtures sowie Browser/E2E-Tests mit echter Playwright-App, echter API und isolierten Laufzeitdaten unter `tests/.runtime`.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardView.tsx` | geändert | Inline-Headlines für eingebettete Dashboard-Tabs ausgeblendet und `Tab-Editor` rechts oben ergänzt |
| `apps/web/src/components/projects/ProjectForm.tsx` | geändert | Redundante erste Tab-Headlines entfernt |
| `apps/web/src/components/milestones/MilestoneForm.tsx` | geändert | `Stammdaten`-Tab auf `Details` umbenannt und redundante Tab-Headlines entfernt |
| `apps/web/src/components/tasks/TaskForm.tsx` | geändert | Redundante erste Tab-Headlines entfernt |
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Redundante erste Tab-Headlines entfernt |
| `apps/web/src/components/features/FeatureForm.tsx` | geändert | Redundante erste Tab-Headlines entfernt |
| `apps/web/src/components/usecases/UseCaseForm.tsx` | geändert | `Stammdaten`-Tab auf `Details` umbenannt und redundante Tab-Headlines entfernt |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Erwartung auf entfernte `Stammdaten`-Headline angepasst |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Erwartung auf `Details`-Tab angepasst |
| `tests/unit/web/components/usecases/UseCaseForm.test.tsx` | geändert | Erwartung auf `Details`-Tab angepasst |
| `tests/browser/web/dashboard.spec.ts` | geändert | E2E-Erwartung auf `Tab-Editor` und entfernte Dashboard-Headline angepasst |
| `tests/browser/web/start-page.spec.ts` | geändert | E2E-Erwartung auf `Tab-Editor` angepasst |
| `tests/browser/web/milestone.spec.ts` | geändert | Testbeschreibung auf `Details` aktualisiert |
| `logs/2026-05-25-fix-tab-headlines-und-editor.md` | neu | Schritt-Log für diesen Auftrag |

## Probleme und Abweichungen

Keine. Während der Playwright-Ausführung wurden nur bestehende React-Router-Future-Warnings ausgegeben; die Tests waren grün.

## Offene Punkte / Folgeaufgaben

Keine.
