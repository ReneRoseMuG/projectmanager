# Log: Terminformular Farbwähler

**Datum:** 31.05.26  
**Uhrzeit:** 07:55:15  
**Schritt:** Fix — Terminformular Farbwähler  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Farbwähler wurde aus dem Terminformular entfernt. Bestehende Termine behalten ihre gespeicherte Farbe beim Speichern, neue Termine erhalten weiterhin den bisherigen Standardwert. Damit bleibt der API-Payload kompatibel, ohne dass die Farbe in der Oberfläche noch bearbeitet werden kann.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | ColorPicker-Import, Farbauswahl-State und UI-Feld entfernt |
| `tests/unit/web/components/calendar/EventForm.test.tsx` | geändert | Test prüft entfernten Farbwähler und Farberhalt im Payload |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
