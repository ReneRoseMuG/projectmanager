# Log: Dashboard Widget Registry

**Datum:** 24.05.26  
**Schritt:** 1 — Widget-Registry für neue Dashboard-Widgets erweitern  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Dashboard-Widget-IDs wurden in den Shared Types um die zehn MS-16-Widgets erweitert. Die erlaubten Widget-Kontexte wurden gemäß Auftrag ergänzt: Home und Global erhalten alle neuen Widgets, Projekt erhält Kalender-, Termin-, Aufgaben-, Ticket- und Meilenstein-Widgets, Meilenstein erhält Aufgaben- und Ticket-Widgets, Task bleibt unverändert. Das Home-Standardlayout enthält nun Kalender und nächste Termine. Die Web-Widget-Registry enthält Metadaten und Lucide-Icons für alle neuen Widget-IDs.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Dashboard-Widget-IDs, erlaubte Kontexte und Home-Defaultlayout ergänzt |
| `apps/web/src/components/dashboard/widgetRegistry.tsx` | geändert | Registry-Metadaten für alle neuen Dashboard-V2-Widgets ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Die neuen Widget-IDs sind registriert, aber ihre Rendering- und Datenpfade werden in den nächsten Schritten umgesetzt.
