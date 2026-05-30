# Log: Realtime-API-Infrastruktur

**Datum:** 23.05.26  
**Schritt:** 2 — Eventbus und SSE-API-Infrastruktur  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Ein typisierter Realtime-Invalidierungs-Event wurde in den Shared Types ergänzt und der Permission-Katalog um `realtime` erweitert. Die API besitzt jetzt einen app-weiten Eventbus, der Events publiziert und Subscriber verwaltet. Ein zentraler Fastify-Hook erfasst `X-Client-Tab-Id` und publiziert nach erfolgreichen mutierenden API-Requests einen passenden Invalidierungs-Scope. Der neue SSE-Endpunkt `/api/realtime/stream` ist über `realtime:read` geschützt und hält Clients mit Keepalive-Kommentaren offen. `packages/shared-types` und `apps/api` kompilieren nach diesem Schritt erfolgreich.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Realtime-Eventtypen und `realtime`-Resource ergänzt |
| `apps/api/src/services/realtime-event-bus.service.ts` | neu | App-interner Eventbus mit Publish/Subscribe |
| `apps/api/src/plugins/realtime.ts` | neu | Tab-ID-Erfassung und zentrale Publish-Hook-Logik |
| `apps/api/src/routes/realtime.ts` | neu | Geschützter SSE-Stream |
| `apps/api/src/app.ts` | geändert | Eventbus, Publisher und Realtime-Route registriert |
| `apps/api/src/types.ts` | geändert | Fastify-Typen für Eventbus und `sourceTabId` erweitert |
| `tests/fixtures/api/app.ts` | geändert | Test-App mit Eventbus und Realtime-Route ergänzt |

## Probleme und Abweichungen

Die Event-Emission erfolgt zentral im Fastify-`onSend`-Hook nach erfolgreicher mutierender Route statt einzeln in jedem Service. Das deckt die Schreibpfade breiter ab und vermeidet großflächige Service-Signaturänderungen; fachlich bleibt die Emission nach erfolgreichem Serviceabschluss.

## Offene Punkte / Folgeaufgaben

Frontend-Realtime-Sync, UI-Cleanup und gezielte Tests fehlen noch.
