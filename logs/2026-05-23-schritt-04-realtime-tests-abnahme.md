# Log: Realtime Tests und Abnahme

**Datum:** 23.05.26  
**Schritt:** 4 — Realtime Tests und Abnahme  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die finalen Build-, Unit-, Integration- und Browserprüfungen wurden seriell ausgeführt. Während der Browserprüfung zeigte der neue Realtime-E2E zunächst, dass der gehijackte SSE-Endpunkt seine CORS-Header nicht selbst schrieb; diese Lücke wurde im bestehenden Realtime-Endpunkt behoben, weil `reply.hijack()` den normalen CORS-Antwortpfad umgeht. Zusätzlich invalidiert der Web-Realtime-Hook beim Öffnen des Streams einmal den bestehenden Query-Bestand, damit kurz vor dem Verbindungsaufbau entstandene Änderungen nicht verpasst werden. Danach liefen API-Tests, Web-Tests und der vollständige Playwright-Lauf grün durch. Die abschließende KI-Treffersuche findet die entfernten KI-Begriffe nur noch in der ursprünglichen Auftragsdatei; MCP-Dokumentation, Logs und Runtime-Artefakte waren bewusst nicht Teil des Scopes.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/routes/realtime.ts` | geändert | SSE-Response schreibt CORS-Header bei gehijackter Antwort selbst |
| `apps/web/src/hooks/useRealtimeSync.ts` | geändert | Realtime-Sync invalidiert beim Öffnen des Streams einmal den Query-Bestand |
| `tests/integration/api/realtime.test.ts` | neu | API-Tests für geschützten SSE-Endpunkt und Event-Publishing |
| `tests/unit/api/services/realtime-event-bus.service.test.ts` | neu | Unit-Test für Realtime-Eventbus |
| `tests/unit/web/api/client.test.ts` | neu | Unit-Test für `X-Client-Tab-Id` bei mutierenden Web-Requests |
| `tests/browser/web/realtime.spec.ts` | neu | Browser-Abnahme für externe Realtime-Aktualisierung und entfernte Refresh-Buttons |
| `logs/2026-05-23-schritt-04-realtime-tests-abnahme.md` | neu | Abschlusslog für Tests und Abnahme |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Der erste vollständige E2E-Lauf schlug mit zwei roten Tests fehl: ein bestehender Attachment-Fehler und der neue Realtime-Browserfall. Der Attachment-Fehler trat im finalen Wiederholungslauf nicht mehr auf. Der Realtime-Fehler wurde auf fehlende CORS-Header im manuell gehijackten SSE-Response-Pfad zurückgeführt und innerhalb des bestätigten Event-Bus-Scopes korrigiert. Die Service-Instrumentierung erfolgt zentral über einen Fastify-`onSend`-Hook nach erfolgreichen mutierenden API-Requests statt einzeln in jedem Service; dadurch bleiben Service-Signaturen unverändert und alle bestehenden Schreibpfade werden einheitlich erfasst.

## Offene Punkte / Folgeaufgaben

Keine.
