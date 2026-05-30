# Log: Dashboard E2E Testfixes

**Datum:** 22.05.26  
**Schritt:** Fix — Dashboard E2E Testfixes  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die browserseitigen Testfixes aus dem letzten Testreport wurden gezielt umgesetzt. URL-Erwartungen für Feature-, Projekt- und Ticket-Detailrouten akzeptieren nun den erwarteten `returnTo`-Query-Parameter, ohne die geprüfte Zielroute aufzuweichen. Toast-Prüfungen verwenden jetzt den eigentlichen Toast-Live-Region-Container statt `page.getByRole("status")`, weil die DnD-Live-Region denselben ARIA-Role-Namen nutzt. Der Freshness-Test für den Aufgaben-Tab prüft nun die leere gruppierte Aufgabenansicht mit Statusspalten statt den nicht mehr gerenderten Empty-State-Text. Produktcode, API, Datenbank, Rollen und Berechtigungen wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/browser/web/domain-test-utils.ts` | geändert | Helfer für optionale Query-Parameter und Toast-Assertions ergänzt |
| `tests/browser/web/feature.spec.ts` | geändert | Feature-URL-Assertions auf optionale Query-Parameter angepasst |
| `tests/browser/web/project.spec.ts` | geändert | Projekt-URL-Assertions auf optionale Query-Parameter angepasst |
| `tests/browser/web/tickets.spec.ts` | geändert | Ticket-URL-Assertions und Toast-Prüfungen angepasst |
| `tests/browser/web/owner-tasks.spec.ts` | geändert | Toast-Prüfungen auf den Toast-Container umgestellt |
| `tests/browser/web/freshness.spec.ts` | geändert | Aufgaben-Leerzustand an gruppierte Aufgabenansicht angepasst |
| `logs/2026-05-22-fix-dashboard-e2e-testfixes.md` | neu | Schritt-Log für den Testfix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der gezielte E2E-Lauf für `feature.spec.ts`, `project.spec.ts`, `tickets.spec.ts`, `owner-tasks.spec.ts` und `freshness.spec.ts` ist noch nicht vollständig grün: 28 von 31 Tests liefen erfolgreich, die drei Owner-Aufgaben-Flows bleiben rot. Die ursprüngliche Strict-Mode-Verletzung bei `getByRole("status")` ist dort behoben; danach wird ein Folgeproblem sichtbar, bei dem nach dem Link-Flow im Browser nicht die verknüpfte Aufgabe im Owner-Board erscheint. Die API-Integrationstests für Owner-Task-Link/Unlink sind dagegen grün, daher wurde der Produktcode in diesem Testfix-Schritt bewusst nicht geändert.

## Offene Punkte / Folgeaufgaben

Die drei Browserfälle in `tests/browser/web/owner-tasks.spec.ts` benötigen einen separaten Folgeauftrag zur Analyse des UI-Link-Flows oder der Browser-Testsequenz. Ein vollständiger E2E-Lauf wurde wegen der bekannten verbleibenden Owner-Aufgaben-Fehler nicht erneut gestartet.
