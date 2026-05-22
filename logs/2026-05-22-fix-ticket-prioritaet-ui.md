# Log: Ticket-Priorität UI

**Datum:** 22.05.26  
**Schritt:** Fix — Ticket-Priorität UI  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Prioritätsauswahl im Hauptbereich des Ticket-Formulars wurde vom Dropdown auf die bestehende RadioList-Darstellung umgestellt. Damit verwendet „Priorität“ denselben UI-Typ wie „Typ“ und übernimmt weiterhin die Labels und Farben aus dem Prioritätskatalog. Die zweispaltigen Bereiche für Typ/Priorität sowie Status/Lösung werden nun oben ausgerichtet, damit Controls mit unterschiedlicher Höhe nicht mehr vertikal auseinandergezogen werden. Im Sub-Ticket-Dialog wurde die Status/Prioritäts-Zeile ebenfalls oben ausgerichtet, ohne den dortigen Dropdown-Typ zu verändern. API, Datenmodell, Berechtigungen und Persistenz wurden nicht geändert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/tickets/TicketForm.tsx` | geändert | Priorität im Hauptformular als RadioList gerendert und betroffene Grid-Zeilen oben ausgerichtet |
| `logs/2026-05-22-fix-ticket-prioritaet-ui.md` | neu | Schritt-Log für den UI-Fix |
| `logs/README.md` | geändert | Log-Index um den neuen Fix ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Kein vollständiger Testlauf ausgeführt. Verifiziert wurde `npm run typecheck -w apps/web`.
