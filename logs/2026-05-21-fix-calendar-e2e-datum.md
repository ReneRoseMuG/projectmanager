# Log: Calendar E2E Datum

**Datum:** 21.05.26  
**Schritt:** Fix — Calendar-E2E-Datum  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Calendar-E2E-Fixtures verwenden nicht mehr fest den 01.12.26, sondern erzeugen Standardtermine am aktuellen lokalen Testdatum. Dafür wurde ein gemeinsamer Helper für `yyyy-MM-dd` ergänzt und in UI- sowie API-basierten Calendar-Event-Flows verwendet. Zusätzlich wurde der Event-Selector in der Calendar-Spec korrigiert, weil FullCalendar Termine im Accessibility Tree als sichtbaren Text im Kalender-Grid und nicht als Button bereitstellt. Produktcode, API, Datenbank und Berechtigungen blieben unverändert.

## Geänderte / angelegte Dateien

| Datei                                       | Art      | Kurzbeschreibung                                                                                |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `tests/browser/web/calendar.spec.ts`        | geändert | Calendar-Events werden am aktuellen Testdatum erstellt und per sichtbarem Event-Text selektiert |
| `tests/browser/web/domain-test-utils.ts`    | geändert | Gemeinsamer `todayIsoDate`-Helper und dynamische Standardzeiten für API-Events                  |
| `logs/2026-05-21-fix-calendar-e2e-datum.md` | neu      | Schritt-Log für den E2E-Fix                                                                     |
| `logs/README.md`                            | geändert | Log-Index ergänzt                                                                               |

## Probleme und Abweichungen

Der erste gezielte Playwright-Aufruf mit relativem Dateipfad fand wegen der Playwright-TestDir-Auflösung keine Tests. Der anschließende gezielte Lauf mit `calendar.spec.ts` sowie der vollständige Web-E2E-Lauf waren erfolgreich.

## Offene Punkte / Folgeaufgaben

Keine.
