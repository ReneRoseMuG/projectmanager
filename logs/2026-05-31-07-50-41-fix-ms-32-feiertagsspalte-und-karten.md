# Log: MS-32 Feiertagsspalte und Karten

**Datum:** 31.05.26  
**Uhrzeit:** 07:50:41  
**Schritt:** Fix — MS-32 Feiertagsspalte und Karten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Feiertagsspalte im Wochenkalender wurde so nachgezogen, dass die gesamte Spaltenfläche einen dezenten roten Hintergrund erhält. Dafür wird nicht nur der Kopfbereich, sondern die komplette Tagesspalte mit einer `crimson`-Mischfarbe eingefärbt. Zusätzlich wurden die im Kalender sichtbaren Aufgabenkarten auf den Board-Card-Stil umgestellt, weil diese Karten in der Kalenderansicht die praktisch sichtbaren Terminkarten darstellen. Der alte farbige Vollkopf und der Datumsfooter wurden entfernt; die Karte nutzt nun einen schmalen Statusakzent, ein Aufgaben-Icon und eine Statuspill.

Die Testleitplanken wurden angewendet. Testebene ist Web-Unit/Component mit jsdom; bewiesen werden die rote Feiertagsspalte und der neue Board-Card-Aufbau der Wochenkarten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Feiertagsspalte als komplette rote Fläche per Token-Mischfarbe umgesetzt |
| `apps/web/src/components/calendar/WeekTaskTile.tsx` | geändert | Wochen-Aufgabenkarten auf Board-Card-Stil ohne Datumsfooter umgestellt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Assertions für rote Spaltenfläche und Board-Card-Karten angepasst |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
