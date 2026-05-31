# Log: Wochenkalender Create nur Plus

**Datum:** 31.05.26  
**Uhrzeit:** 07:59:29  
**Schritt:** Fix — Wochenkalender Create nur Plus  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Klickhandler auf der gesamten Tagesspalte wurde entfernt. Eine Termin-Erstellung im Wochenkalender wird jetzt ausschließlich über den Plus-Button im jeweiligen Spaltenkopf ausgelöst. Die zuvor ergänzte Tastaturauslösung auf der Spalte wurde ebenfalls entfernt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Spalten-Click und Spalten-Tastaturhandler entfernt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Test ergänzt, dass Create nur über den Plus-Button ausgelöst wird |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
