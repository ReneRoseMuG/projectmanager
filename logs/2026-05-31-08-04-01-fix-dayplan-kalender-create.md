# Log: DayPlan Kalender Create

**Datum:** 31.05.26  
**Uhrzeit:** 08:04:01  
**Schritt:** Fix — DayPlan Kalender Create  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Kalenderwidget in der persönlichen Planung wurde wieder für Termin-Erstellung freigeschaltet, sofern Schreibrechte für Termine und Tagesplanung vorhanden sind. Im DayPlan-Kontext speichert das Formular nun über `dayPlan.createEvent` statt über den globalen Event-Create. Zusätzlich wird der DayPlan-Owner als initialer Owner an das Terminformular übergeben, damit neue Termine der persönlichen Planung zugeordnet werden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | DayPlan-Kalender interaktiv geschaltet und Create-Pfad auf DayPlan-Service verdrahtet |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Erwartung für DayPlan-Kalender von read-only auf interaktiv angepasst |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
