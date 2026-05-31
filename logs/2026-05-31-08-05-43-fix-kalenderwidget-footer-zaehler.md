# Log: Kalenderwidget Footer-Zähler

**Datum:** 31.05.26  
**Uhrzeit:** 08:05:43  
**Schritt:** Fix — Kalenderwidget Footer-Zähler  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Footer unter dem zentralen Kalenderwidget wurde entfernt. Damit werden die Zähler für Termine und fällige Aufgaben nicht mehr unter Wochen- oder Monatskalender angezeigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/CalendarWidgetView.tsx` | geändert | Footer mit Termin-/Aufgaben-Zählern entfernt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Test ergänzt, dass keine Kalender-Footer-Zähler gerendert werden |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
