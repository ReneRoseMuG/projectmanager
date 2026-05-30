# Log: Realtime-Frontend-Sync

**Datum:** 23.05.26  
**Schritt:** 3 — Frontend-Realtime-Sync und UI-Cleanup  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Web-API-Client erzeugt pro Browser-Tab eine Session-Tab-ID und sendet sie bei mutierenden Requests als `X-Client-Tab-Id`. Ein globaler `useRealtimeSync`-Hook öffnet den geschützten SSE-Stream, ignoriert eigene Events und mappt fremde Realtime-Scopes auf bestehende React-Query-Invalidierungen. Nach einem Reconnect wird breit invalidiert, um verpasste Events auszugleichen. Der Hook wird im App-Root aktiviert, sobald ein angemeldeter Nutzer `realtime:read` besitzt. Redundante Standalone-Refresh-Buttons wurden aus Projects, Milestones, Tasks, Tickets, Features, Wiki, Calendar und Journal entfernt; operative Refresh-Aktionen für Backup, Serverstatus und ErrorBoundary bleiben erhalten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/api/client.ts` | geändert | Tab-ID-Erzeugung und Header für Mutations ergänzt |
| `apps/web/src/hooks/useRealtimeSync.ts` | neu | SSE-Client und Scope-Invalidierung |
| `apps/web/src/App.tsx` | geändert | Globalen Realtime-Hook eingebunden |
| `apps/web/src/pages/*Page.tsx` | geändert | Redundante Standalone-Refresh-Buttons entfernt |

## Probleme und Abweichungen

Keine. `npm run build -w apps/web` lief erfolgreich durch; Vite meldete nur die bereits bekannte Chunk-Größenwarnung.

## Offene Punkte / Folgeaufgaben

Gezielte API-/Web-/E2E-Tests für Realtime-Verhalten stehen noch aus.
