# Log: MS-32 offene Kalenderaufgaben

**Datum:** 31.05.26  
**Uhrzeit:** 07:28:44  
**Schritt:** Feature — MS-32 offene Kalenderaufgaben  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die beiden offenen Aufgaben aus MS-32 wurden im zentralen Kalenderpfad umgesetzt. Die Wochenansicht beschriftet die Tagesspalten mit Wochentag und Datum inklusive Monatskürzel, setzt Feiertagslabels in eine eigene Zeile und hebt Feiertagsspalten sichtbar rot über `crimson` hervor. Der aktuelle Tag bekommt einen deutlich dunklen Spaltenkopf, sofern er nicht selbst als Feiertag rot markiert wird. Terminkarten verwenden nun eine Board-Card-nahe Darstellung mit Domain-Icon, Statusanzeige, Status-/Kontext-Akzent und ohne Datumsfooter. Im Terminformular wurden die Verknüpfungselemente entfernt; vorhandene Owner bleiben beim Speichern erhalten.

Die Testleitplanken wurden angewendet. Testebene ist Web-Unit/Component mit jsdom; bewiesen werden sichtbare Kalenderzustände, Owner-Erhalt im Formular und der zentrale Dashboard-Kalenderpfad.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/WeekCalendar.tsx` | geändert | Wochenkopf, Feiertagsspalten, Heute-Hervorhebung und Status-Akzentlogik angepasst |
| `apps/web/src/components/calendar/WeekEventTile.tsx` | geändert | Terminkarten auf Board-Card-Stil mit Domain-Icon, Status und Akzent umgestellt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Verknüpfungselemente entfernt und bestehende Owner im Payload bewahrt |
| `apps/web/src/components/dashboard/DashboardWidgets.tsx` | geändert | DayPlan-Kalender im kompakten Dashboard-Kontext read-only geschaltet |
| `apps/web/src/lib/task-status-color.ts` | geändert | Statusfarben für `active` und `pending` ergänzt |
| `tests/unit/web/components/calendar/WeekCalendar.test.tsx` | geändert | Tests für Feiertag 25.05.26, Heute-Kopf, Terminkarten und Statusfarben angepasst |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Tests auf entfernte Verknüpfungselemente und Owner-Erhalt angepasst |
| `tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` | geändert | Bestehender Kalenderpfad-Test läuft wieder gegen read-only DayPlan-Kontext |

## Probleme und Abweichungen

Der fokussierte Testlauf `npm run test -w apps/web -- tests/unit/web/components/calendar/WeekCalendar.test.tsx tests/unit/web/components/calendar/EventForm.test.tsx tests/unit/web/components/dashboard/DashboardWidgets.test.tsx` ist grün: 38 Tests bestanden. `npm run typecheck -w apps/web` ist grün.

Der vollständige Web-Testlauf `npm run test -w apps/web` schlägt weiterhin mit 16 nicht kalenderbezogenen Fehlern in 13 Dateien fehl, unter anderem `FormSidebar`, `ActionMenu`, `Section`, `WikiTree` und mehrere Formular-Tests. Diese Fehler liegen außerhalb des MS-32-Kalenderumfangs und wurden gemäß Testregel nicht nebenbei repariert. Die Browserprüfung von `http://localhost:5173/calendar` wurde durch Redirect auf `/login` blockiert, weil in der headless Session keine Sitzung vorhanden war.

## Offene Punkte / Folgeaufgaben

Die offenen Fremdfehler im vollständigen Web-Testlauf sollten in einem separaten Auftrag behandelt werden. Für eine visuelle Browserabnahme der Kalenderseite wird eine nutzbare lokale Testsitzung benötigt.
