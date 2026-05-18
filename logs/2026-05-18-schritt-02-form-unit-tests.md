# Log: Form-Unit-Tests

**Datum:** 18.05.26  
**Schritt:** 2 — Unit-Tests: Unified Forms restrukturieren  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die bisherige Sammeldatei `OwnerForms.test.tsx` wurde in vier komponentennahe Testdateien für `UseCaseForm`, `TaskModal`, `FeatureForm` und `ProjectForm` aufgeteilt. Jede Datei enthält den geforderten Scope-Kommentar und mindestens 12 Testfälle zu Create-Modus, Pending-Listen, Submit-Payloads, Reset-Verhalten und Edit-Modus-Verwaltungen. Zusätzlich wurde ein gemeinsames Test-Setup für Fixtures, Provider und wiederverwendbare Mocks angelegt, damit die vier Testdateien nicht dieselbe Mock-Landschaft duplizieren müssen. Der Web-Unit-Testlauf wurde nach der Restrukturierung ausgeführt und war grün mit 24 Testdateien und 182 bestandenen Tests.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/usecases/__tests__/UseCaseForm.test.tsx` | neu | 12 Tests für UseCaseForm |
| `apps/web/src/components/tasks/__tests__/TaskModal.test.tsx` | neu | 12 Tests für TaskModal |
| `apps/web/src/components/features/__tests__/FeatureForm.test.tsx` | neu | 13 Tests für FeatureForm |
| `apps/web/src/components/projects/__tests__/ProjectForm.test.tsx` | neu | 12 Tests für ProjectForm |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | neu | Gemeinsame Fixtures, Provider und Mocks für Form-Tests |
| `apps/web/src/components/__tests__/OwnerForms.test.tsx` | gelöscht | Monolithische Sammeldatei ersetzt |
| `logs/2026-05-18-schritt-02-form-unit-tests.md` | neu | Schritt-Log für Schritt 2 |
| `logs/README.md` | geändert | Log-Index um Schritt 2 ergänzt |

## Probleme und Abweichungen

Die Nacharbeitsdatei fordert beim `FeatureForm`-Use-Case-Tab im Create-Modus eine `PendingRelationList` mit beiden Aktionen. Die aktuelle Produktlogik zeigt dort bewusst nur „Neu erstellen" und keine Verknüpfung bestehender Use Cases. Das entspricht der ursprünglichen Festlegung, dass bestehende Use Cases im Feature-Create nicht verknüpft oder verschoben werden. Die Tests sichern deshalb die aktuelle fachliche Regel ab und markieren dies als Abweichung zur Nacharbeitsformulierung.

## Offene Punkte / Folgeaufgaben

Falls bestehende Use Cases künftig doch an ein neu erstelltes Feature umgehängt werden sollen, braucht es eine separate fachliche Entscheidung und eine Produktionscode-Erweiterung für das dazugehörige Verhalten.
