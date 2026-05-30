# Log: Globale Suche

**Datum:** 22.05.26  
**Schritt:** Fix — Globale Suche  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die globale Suche zeigt keine künstlich generierten Kennungen wie `TASK-2`, `PROJECT-1` oder ähnliche Meta-Kürzel mehr an. Treffer werden nur noch über fachlich sichtbare Felder gefiltert: Projektnamen, Meilensteinnamen, Titel, Wiki-Titel, Notiz-Titel und Dateinamen. Aufgaben- und Ticket-Treffer navigieren jetzt direkt auf ihre Detailrouten statt pauschal zur Projekt- oder Ticketliste. Projektnotizen und Projektdateien behalten im Suchdaten-Hook ihren Projektkontext, damit ein Klick auf die passende Projekt-Detailseite führen kann. Die Schnellaktion „Neues Projekt“ und die irreführende Leere-Treffer-Aktion wurden aus dem Suchdialog entfernt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Suchfilterung, Trefferanzeige, Trefferzahlen, Schnellaktionen und Detailnavigation bereinigt |
| `apps/web/src/hooks/useGlobalSearchData.ts` | geändert | Projektkontext für geladene Projektnotizen und Projektdateien ergänzt |
| `tests/unit/web/components/search/GlobalSearch.test.tsx` | neu | Unit-Test für Suchrelevanz, entfernte Kennungen, entfernte Schnellaktion und Aufgaben-Navigation |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
