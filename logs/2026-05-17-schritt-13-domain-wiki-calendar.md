# Log: Domain Wiki & Kalender

**Datum:** 17.05.26  
**Schritt:** 13 — Domain: Wiki & Kalender  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Wiki-Detailansicht wurde um eine Tab-Struktur erweitert und enthält nun einen vorbereiteten Kommentare-Tab. Der Wiki-Inhaltseditor nutzt explizit den neuen `RichTextEditor` mit voller Toolbar. `WikiPageForm` bleibt strukturell erhalten, setzt den Editor aber ebenfalls auf `toolbar="full"`. `EventForm` wurde auf `FormModal`, `Section`, `FormField`, `Input`, `DatePicker`, `Select`, `ColorPicker` und `RichTextEditor toolbar="minimal"` umgestellt. `UpcomingEvents` rendert anstehende Termine jetzt über `ItemRow`, während `CalendarView` unverändert bleibt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/wiki/WikiPageDetail.tsx` | geändert | Inhalts-/Kommentare-Tabs und voller RTF-Editor |
| `apps/web/src/components/wiki/WikiPageForm.tsx` | geändert | Wiki-Editor explizit auf volle Toolbar gesetzt |
| `apps/web/src/components/calendar/EventForm.tsx` | geändert | Terminformular auf `FormModal` und minimalen RTF-Editor umgestellt |
| `apps/web/src/components/calendar/UpcomingEvents.tsx` | geändert | Termine auf `ItemRow` umgestellt |
| `logs/2026-05-17-schritt-13-domain-wiki-calendar.md` | neu | Schritt-Log für Schritt 13 |
| `logs/README.md` | geändert | Log-Index um Schritt 13 ergänzt |

## Probleme und Abweichungen

Der Wiki-Kommentare-Tab ist vorbereitet; die echte `CommentThread`-Verdrahtung folgt im Kommentar-Rollout von Schritt 14. `WikiImportPanel` und `CalendarView` wurden wie beauftragt strukturell unverändert gelassen.

## Offene Punkte / Folgeaufgaben

Kommentar-Backend und Hooks für Wiki-Seiten in Schritt 14 anschließen. Die roten E2E-Flows bleiben wie vereinbart für die spätere Klärung offen.

## Test-Ergebnis

| Kommando | Ergebnis |
|---|---|
| `npm run typecheck -w apps/web` | ✅ Erfolgreich |
