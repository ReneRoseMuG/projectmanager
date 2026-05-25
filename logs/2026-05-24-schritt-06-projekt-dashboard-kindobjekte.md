# Log: Projekt Dashboard Kindobjekte

**Datum:** 24.05.26  
**Schritt:** 6 — Projekt-Kontext schließt Meilenstein-Aufgaben und -Tickets ein  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die projektbezogenen Dashboard-Listen für Aufgaben und Tickets nutzen weiterhin die bestehenden Owner-Listen, die direkte Projektobjekte und geerbte Meilenstein-Kindobjekte zusammenführen. Zusätzlich wurde im Dashboard-Pfad eine Deduplizierung nach Objekt-ID ergänzt. Damit werden Aufgaben und Tickets, die sowohl direkt am Projekt als auch an einem Projekt-Meilenstein hängen, in Status-Reports, Journals und Board/List-Widgets nicht doppelt gezählt oder angezeigt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/tasks.service.ts` | geändert | Projekt-Dashboard-Aufgaben nach ID dedupliziert |
| `apps/api/src/services/tickets.service.ts` | geändert | Projekt-Dashboard-Tickets nach ID dedupliziert |

## Probleme und Abweichungen

Die vorhandenen Service-Helfer enthielten bereits die Zusammenführung von direkten Projektobjekten und Meilenstein-Kindobjekten. Die Änderung beschränkt sich daher auf die explizite Absicherung des Dashboard-Pfads gegen Duplikate.

## Offene Punkte / Folgeaufgaben

Die Statistikfälle für Projekt-Owner werden im Testschritt mit echten Integrationstests abgesichert.
