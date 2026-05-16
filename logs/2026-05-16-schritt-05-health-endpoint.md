# Log: Health-Endpoint

**Datum:** 16.05.26  
**Schritt:** 5 — Health-Endpoint + TopBar-Indikator  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die API stellt nun `GET /api/health` bereit und liefert `{ status: "ok", uptime: number }`. Der Endpoint wurde als eigenes Fastify-Plugin umgesetzt und in der zentralen App-Factory registriert, damit er in Runtime und Tests identisch verfügbar ist. Im Web gibt es einen neuen Health-Client und einen Hook, der alle 30 Sekunden pollt und Online-Status sowie Latenz berechnet. Die TopBar zeigt neben `Single-User Workspace` einen Statuspunkt und `localhost:3001`. Zusätzlich wurde ein Integrationstest für `/api/health` ergänzt und erfolgreich ausgeführt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/health.ts` | neu | Fastify-Plugin für `/api/health` |
| `apps/api/src/app.ts` | geändert | Health-Route unter `/api` registriert |
| `apps/api/tests/helpers/app.ts` | geändert | Health-Route im Test-App-Builder registriert |
| `apps/api/tests/integration/health.test.ts` | neu | Integrationstest für `/api/health` |
| `apps/web/src/api/health.ts` | neu | Web-Client für Health-Abfrage |
| `apps/web/src/hooks/useHealthCheck.ts` | neu | Pollender Health-Hook |
| `apps/web/src/components/layout/TopBar.tsx` | geändert | API-Statusindikator ergänzt |

## Probleme und Abweichungen

Der Auftrag nannte `apps/api/src/index.ts` als Registrierungsstelle. Im bestehenden Code ist jedoch `apps/api/src/app.ts` die zentrale Fastify-App-Factory und damit die korrekte Stelle für Plugin-Registrierung, insbesondere damit Tests denselben Endpoint nutzen. `index.ts` bleibt unverändert und startet weiterhin nur die App.

## Offene Punkte / Folgeaufgaben

Keine.
