# Log: Wochenkalender Spaltenkopf

**Datum:** 31.05.26  
**Uhrzeit:** 07:54:00  
**Schritt:** Fix — Wochenkalender Spaltenkopf  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Beschriftung der Tagesspalten im Wochenkalender wurde auf eine einzeilige Darstellung umgestellt. Sie zeigt nun Wochentag, Tag und Monatskürzel im Format `Mo 25. Mai`. Der rote Rahmen des Feiertagskopfs wurde entfernt; die Feiertagsspalte bleibt weiterhin über die gesamte Spaltenfläche dezent rot eingefärbt. Außerdem wurde der Außenabstand der Spaltenköpfe entfernt, indem der Header bündig an der Spalte sitzt und der Innenabstand nur noch für den Kartenbereich gilt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Einzeilige Datumsbeschriftung, bündiger Header und Feiertagskopf ohne roten Rahmen |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Assertions für einzeilige Beschriftung und entfernten roten Rahmen ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
