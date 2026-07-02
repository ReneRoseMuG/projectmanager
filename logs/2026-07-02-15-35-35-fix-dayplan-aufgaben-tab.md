# Log: DayPlan Aufgaben-Tab

**Datum:** 02.07.26  
**Uhrzeit:** 15:35:35  
**Schritt:** Fix — DayPlan Aufgaben-Tab  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der datumsübergreifende DayPlan-Aufgaben-Endpunkt mappt Aufgaben nun gebündelt statt pro Aufgabe mehrere Zusatzabfragen auszulösen. Dafür wurde in der Aufgaben-Service-Schicht ein wiederverwendbarer Batch-Mapper für `TaskBoardItem` ergänzt und im DayPlan-Service für `listDayPlanTasksForUser` verwendet. Der Aufgaben-Tab der persönlichen Planung zeigt außerdem Fehler aus der datumsübergreifenden Aufgabenabfrage sichtbar an, statt bei einem fehlgeschlagenen Request still eine leere Liste zu zeigen. Damit werden lange Ladezeiten reduziert und echte API-/Berechtigungsfehler im UI unterscheidbar von „keine Aufgaben vorhanden“.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Batch-Mapper `mapTaskBoardItems` für Aufgabenlisten ergänzt |
| `apps/api/src/services/day-plan.service.ts` | geändert | DayPlan-Aufgabenliste nutzt gebündeltes Mapping |
| `apps/web/src/pages/DayPlanPage.tsx` | geändert | Aufgaben-Tab zeigt Ladefehler sichtbar an |
| `tests/unit/web/pages/DayPlanPage.test.tsx` | geändert | Unit-Test für sichtbare Fehleranzeige ergänzt |
| `logs/2026-07-02-15-35-35-fix-dayplan-aufgaben-tab.md` | neu | Schritt-Log |

## Testleitplanken

Der Testentwurfs-Skill wurde angewendet. Betroffen sind API-Integrationstests mit echter Fastify-App, echter Testdatenbank, echten Rollen und Sessions sowie ein Web-Unit-Test mit gemockten Child-Komponenten. Bewiesen wurde das datumsübergreifende Laden der DayPlan-Aufgaben inklusive Deduplizierung sowie die sichtbare Fehleranzeige im Aufgaben-Tab.

## Probleme und Abweichungen

Der direkte Browser-Request konnte in dieser Umgebung nicht mit der bestehenden Browser-Session geprüft werden; der Browser-Control-Kanal war durch ein Sandbox-Metadatenproblem blockiert. Die API wurde daher über vorhandene Integrationstests und den Build verifiziert.

## Offene Punkte / Folgeaufgaben

Keine.
