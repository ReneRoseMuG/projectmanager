# Log: Feiertag-Hervorhebung

**Datum:** 31.05.26  
**Uhrzeit:** 07:14:08  
**Schritt:** Fix — Feiertag-Hervorhebung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Feiertagsdarstellung im Kalender wurde sichtbar roter gestaltet. Wochenkalender-Spalten für Feiertage verwenden jetzt eine stärkere `crimson`-Fläche; der Tageskopf erhält ebenfalls eine rote Fläche und einen roten Rahmen. Monatskalender-Kacheln für Feiertage verwenden dieselbe stärkere rote Fläche plus roten Rahmen. Die Änderung bleibt auf vorhandene Projekt-Manager-Tokens beschränkt und übernimmt keine MuGPlan-Raw-Farben.

Testleitplanken wurden angewendet. Testebene: Web-Unit/jsdom. Bewiesen wird, dass echte Feiertagsdaten aus dem bestehenden Feiertagslookup in Woche und Monat eine sichtbare rote DOM-Markierung erhalten. Es wurden keine DB-, API- oder Dateisystemdaten verwendet.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Feiertagsspalten und Tageskopf stärker rot markiert |
| `apps/web/src/components/calendar/MonthCalendar.tsx` | geändert | Feiertagskacheln stärker rot markiert und mit rotem Rahmen versehen |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Test für rote Feiertagsmarkierung in Woche und Monat ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
