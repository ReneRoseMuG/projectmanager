# Log: Web-Unit-Test-Erwartungen

**Datum:** 24.05.26  
**Schritt:** Fix — Testseitig lösbare Web-Unit-Fehler  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die testseitig lösbaren Web-Unit-Fehler aus dem Testlauf wurden behoben. Der `ProjectsPage`-Unit-Test rendert die echte Page nun mit einem eigenen TanStack-Query-Client, weil die Page inzwischen `useQueryClient()` verwendet. Die Test-Doubles für `TaskForm` und `TicketForm` übergeben vollständige Create-Eingaben mit leeren Tag- und Pending-Listen, damit der Page-Handler wie im echten Formularpfad arbeiten kann. Außerdem wurden veraltete Klassen-Erwartungen in `ListBoardView`- und `ProjectForm`-Tests an die aktuelle Button- und Toggle-Darstellung angepasst. Produktionscode wurde bewusst nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/unit/web/pages/ProjectsPage.test.tsx` | geändert | QueryClientProvider ergänzt und Formular-Doubles an echte Submit-Eingaben angepasst |
| `tests/unit/web/components/ui/ListBoardView.test.tsx` | geändert | Veraltete Button-/Toggle-Klassen-Erwartungen aktualisiert |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Veraltete Listenansicht-Toggle-Erwartung aktualisiert |
| `logs/2026-05-24-fix-web-unit-test-erwartungen.md` | neu | Schritt-Log für den Testfix |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Die gezielt bearbeiteten Testdateien sind grün. Die vollständige Web-Unit-Suite bleibt mit einem bekannten Fehler in `StatusPill.test.tsx` rot; dieser Fall wurde nicht testseitig geändert, weil die Erwartung an den Fallback-Ton fachlich gegen die aktuelle Produktionsimplementierung geprüft werden muss.

Testleitplanken: angewendet wurde der Repo-Skill `projekt-manager-test-entwurfsleitplanken`. Testebene ist Web-Unit mit jsdom; keine DB- oder Dateisystemdaten; vorhandene Component- und Hook-Doubles bleiben auf Unit-Test-Ebene begrenzt.

## Offene Punkte / Folgeaufgaben

- Fachlich entscheiden, ob `StatusPill` bei unbekannten Statuswerten wieder einen Standardton setzen soll oder ob der Test auf die neue `Badge`-Fallback-Darstellung angepasst werden darf.
- Die weiterhin roten Browser/E2E-Fälle aus dem vorherigen Testlauf sind nicht Teil dieses Testfixes.
