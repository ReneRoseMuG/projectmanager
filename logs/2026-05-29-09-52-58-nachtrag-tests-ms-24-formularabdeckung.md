# Log: MS-24 Formular-Testabdeckung

**Datum:** 29.05.26  
**Uhrzeit:** 09:52:58  
**Schritt:** Nachtrag — Tests für MS-24 Formularabdeckung  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Der Testentwurfs-Skill wurde angewendet; betroffen sind Web-Unit-Tests, bestehende Browser/E2E-Testdefinitionen und die bereits vorhandenen API-Integrationstests für die geänderten Parent-Kontexte. Die Formular-Unit-Tests wurden um die neue Body-plus-Sidebar-Struktur, verschobene Stammdatenfelder, vorhandene Initialdaten und Submit-Payloads ergänzt. Feature- und Use-Case-Tests prüfen zusätzlich, dass Kurzbeschreibung und Sortierung nicht mehr im Formular und nicht mehr im Payload auftauchen. Die Browser-Testdefinitionen wurden an die entfernten Feature-/Use-Case-Felder angepasst. Ein gezielter Web-Unit-Lauf für die betroffenen Formular-, Sidebar- und ParentContext-Tests war grün.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `tests/fixtures/web/components/test/ownerFormTestUtils.tsx` | geändert | Fixtures um Parent-Kontexte, Test-User und Auth-/User-Mocks ergänzt |
| `tests/unit/web/components/projects/ProjectForm.test.tsx` | geändert | Sidebar-Layout und Metadaten-Submit-Payload ergänzt |
| `tests/unit/web/components/milestones/MilestoneForm.test.tsx` | geändert | Sidebar-Layout, Tags, Verantwortliche und Datumsfelder getestet |
| `tests/unit/web/components/tasks/TaskForm.test.tsx` | geändert | Parent-Kontext, Sidebar-Felder und Payload getestet |
| `tests/unit/web/components/tickets/TicketForm.test.tsx` | geändert | Parent-Kontext, Bug-Felder, Personenfelder und Payload getestet |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Sidebar-Felder und entfernte Kurzbeschreibung-/Sortierungsfelder getestet |
| `tests/unit/web/components/usecases/UseCaseForm.test.tsx` | geändert | Feature-Kontext, Sidebar-Felder und entfernte Felder getestet |
| `tests/unit/web/components/backlog/BacklogItemForm.test.tsx` | geändert | Parent-Kontext, Feature-Zuordnung, Sortierung und Payload getestet |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Sidebar-Felder, Owner und Reminder-Payload getestet |
| `tests/unit/web/components/ui/FormSidebar.test.tsx` | geändert | Resize-Untergrenze ergänzt |
| `tests/unit/web/components/ui/TaskListBoardView.test.tsx` | geändert | Überfällige Datumsanzeige an neue Markup-Struktur angepasst |
| `tests/browser/web/feature.spec.ts` | geändert | E2E-Erwartungen an entfernte Feature-/Use-Case-Felder angepasst |
| `tests/browser/web/project.spec.ts` | geändert | E2E-Erwartungen für Feature-Form aus Projektkontext angepasst |

## Probleme und Abweichungen

Der vollständige Web-Gesamtlauf wurde nach den Testergänzungen unterbrochen und hat deshalb kein finales Ergebnis. Der E2E-Lauf wurde zuvor ebenfalls unterbrochen. Der vollständige API-Gesamtlauf ist unabhängig von MS-24 noch rot; bekannte Fehlergruppen sind Auth, Dumps, DayPlans und Notifications.

Testleitplanken: Web-Unit-Tests prüfen beobachtbares Formularverhalten in jsdom mit bestehenden Mocks und erweiterten Fixtures. API-Integrationen nutzen die bestehenden isolierten SQLite-Testdaten. Browser/E2E wurde nicht vollständig ausgeführt; nur die Testdefinitionen wurden an das neue Formularverhalten angepasst.

## Offene Punkte / Folgeaufgaben

Vollständigen Web-Gesamtlauf und E2E-Lauf seriell erneut ausführen. API-Altfehler separat klären, bevor MS-24 vollständig testseitig abgenommen wird.
