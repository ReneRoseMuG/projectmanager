# Log: Ticket-Seed-Daten

**Datum:** 17.05.26  
**Schritt:** 10 — Seed-Daten  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der visuelle Seed-Run erzeugt nun Ticket-Demo-Daten. Pro Seed-Projekt werden fünf Top-Level-Tickets mit unterschiedlichen Typen, Statuswerten, Prioritäten und Bug-Schweregraden angelegt. Zusätzlich wird pro Projekt ein Sub-Ticket und eine `blocks`-Relation erzeugt. Ticket-Tags, Ticket-Notizen, Ticket-Kommentar und ein Ticket-Anhang werden ebenfalls in den Seed-Run aufgenommen. Die Seed-Zählung, externe Referenzprüfung und Löschlogik wurden um Ticket-Tabellen erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/seed-data.service.ts` | geändert | Ticket-Seed-Daten, Zählung, Blockerprüfung und Löschung ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die neuen Ticket-Endpunkte müssen noch durch Integrationstests abgesichert werden.
