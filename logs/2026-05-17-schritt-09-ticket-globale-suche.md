# Log: Ticket-Globale-Suche

**Datum:** 17.05.26  
**Schritt:** 9 — Globale Suche um Tickets erweitern  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die globale Suchdatenquelle lädt nun Tickets pro Projekt über `getProjectTickets`. Das `GlobalSearchData`-Interface und der Fallback-Wert enthalten `tickets`. `GlobalSearch.tsx` kennt Tickets als eigenen Scope, zählt sie in „Alle" mit und rendert Treffer mit typspezifischem Icon. Treffer navigieren zur projektübergreifenden Ticket-Seite.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/hooks/useGlobalSearchData.ts` | geändert | Tickets in Suchdaten laden und typisieren |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Ticket-Scope und Ticket-Ergebnisse ergänzt |

## Probleme und Abweichungen

Ticket-Suchergebnisse navigieren aktuell zu `/tickets`, statt direkt ein Detailmodal zu öffnen. Das entspricht einer der im Auftrag erlaubten Navigationsvarianten und bleibt ohne zusätzliche URL-State-Logik stabil.

## Offene Punkte / Folgeaufgaben

Seed-Daten und Tests müssen noch ergänzt werden.
