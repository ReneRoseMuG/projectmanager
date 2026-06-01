# Log: Monatskalender Feiertagskachel

**Datum:** 31.05.26  
**Uhrzeit:** 08:00:50  
**Schritt:** Fix — Monatskalender Feiertagskachel  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Feiertagskachel im Monatskalender wurde sichtbar an die Wochenansicht angeglichen. Statt der bisherigen schwachen `bg-crimson/20`-Klasse nutzt die komplette Tageskachel nun dieselbe explizite `crimson`-Mischfläche wie die Feiertagsspalte im Wochenkalender. Der rote Sonderrahmen wurde dabei vermieden; die Kachel behält den normalen Linienrahmen.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/MonthCalendar.tsx` | geändert | Feiertagskachel als komplette rote Mischfläche umgesetzt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Monatskalender-Assertion auf sichtbare Feiertagsfläche angepasst |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
