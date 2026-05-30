# Log: MS-23 Dashboard-State

**Datum:** 28.05.26  
**Schritt:** 2 — Shared Types, Dashboard-Kontext, Widgetdaten und Query-State  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der neue Dashboard-Kontext `dayPlan` wurde in Shared Types, API-Validierung und Dashboard-Templates ergänzt. `noteList` ist als Widget-ID registriert und für die persönliche Planung freigeschaltet; `attachmentJournal` bleibt dort bewusst nicht erlaubt. Dashboarddaten können Aufgaben, überfällige Aufgaben, Kommentare, Journal und Notizen für einen DayPlan-Owner laden. Frontend-API, Query-Keys und Invalidierung wurden um DayPlan-Notes/-Comments sowie Dashboard-Invalidierung nach Notizänderungen erweitert.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Dashboard-Kontext, Owner und Widgetlisten erweitert |
| `apps/api/src/services/dashboard.service.ts` | geändert | Systemtemplate für persönliche Planung ergänzt |
| `apps/api/src/services/tasks.service.ts` | geändert | Dashboard-Taskdaten für DayPlan-Owner ergänzt |
| `apps/web/src/api/dashboard.ts` | geändert | `noteList`-Widgetdaten und DayPlan-Filter ergänzt |
| `apps/web/src/api/notes.ts` | geändert | DayPlan-Notiz-API ergänzt |
| `apps/web/src/api/comments.ts` | geändert | DayPlan-Kommentarpfad ergänzt |
| `apps/web/src/hooks/useNotes.ts` | geändert | DayPlan-Owner unterstützt |
| `apps/web/src/queries/queryKeys.ts` | geändert | `dayPlan` als Note-Owner ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | DayPlan-Invalidierungen für Notizen und Kommentare ergänzt |

## Probleme und Abweichungen

Keine.

## Offene Punkte / Folgeaufgaben

Keine.
