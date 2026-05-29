# Log: Formulare und Tests

**Datum:** 29.05.26  
**Uhrzeit:** 09:17:55  
**Schritt:** 4 — Stammdatenformulare und gezielte Tests  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Details-Flächen von Projekt, Meilenstein, Aufgabe, Ticket, Feature, Use Case, Backlog-Item und Termin wurden auf Body plus rechte Stammdaten-Sidebar umgestellt. Feature und Use Case senden keine Kurzbeschreibung und keine Sortierung mehr aus den Formularen; vorhandene API-Defaults bleiben erhalten. Tags für Feature, Use Case und Backlog-Item wurden wie beauftragt nicht ergänzt. Parent-Kontext-Badges erscheinen nur in globalen beziehungsweise kontextlosen Detailaufrufen. Die Testleitplanken wurden angewendet: Web-Unit/jsdom prüft UI-Verhalten und Payloads, API-Integration nutzt echte Fastify-App mit isolierter SQLite-Test-DB; neue Tests decken Sidebar, Parent-Kontext, entfernte Payload-Felder, Parent-Kontext-DTOs und Editor-Toolbar ab.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/components/**/**Form.tsx` | geändert | Details-Layouts auf Body plus Sidebar umgestellt |
| `tests/unit/web/components/ui/FormSidebar.test.tsx` | neu | Sidebar-Render, Collapse, Persistenz, Resize |
| `tests/unit/web/components/ui/ParentContextField.test.tsx` | neu | Parent-Badge-Anzeige und Leerzustand |
| `tests/unit/web/components/features/FeatureForm.test.tsx` | geändert | Entfernte Feature-Felder und Content-Payload abgesichert |
| `tests/unit/web/components/usecases/UseCaseForm.test.tsx` | geändert | Entfernte Use-Case-Felder und Content-Payload abgesichert |
| `tests/integration/api/*.test.ts` | geändert | Parent-Kontexte und tolerante Create-Payloads abgesichert |

## Probleme und Abweichungen

Keine. Die gezielten Web- und API-Suiten sowie Web- und API-Builds liefen erfolgreich. Der vollständige serielle Abschlusslauf steht noch aus.

## Offene Punkte / Folgeaufgaben

Vollständigen Abschlusslauf seriell ausführen: `npm run test -w apps/api`, `npm run test -w apps/web`, `npm run e2e -w apps/web`.
