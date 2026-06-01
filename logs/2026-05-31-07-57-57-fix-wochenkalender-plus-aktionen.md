# Log: Wochenkalender Plus-Aktionen

**Datum:** 31.05.26  
**Uhrzeit:** 07:57:57  
**Schritt:** Fix — Wochenkalender Plus-Aktionen  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Plus-Aktion im Wochenkalender wurde über alle Tagesspalten vereinheitlicht. Der heutige Tag verwendet nicht mehr die abweichende `onColor`-Buttonvariante, sondern denselben Ghost-Button-Aufbau wie alle anderen Tage. Das Plus-Symbol wurde vergrößert und die klickbare Iconfläche auf `h-9 w-9` gesetzt. Zusätzlich erhalten interaktive Tagesspalten einen sichtbaren Cursor und eine Tastaturaktivierung über Enter und Leertaste.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Plus-Button vereinheitlicht, Icon vergrößert und Spalteninteraktion ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
