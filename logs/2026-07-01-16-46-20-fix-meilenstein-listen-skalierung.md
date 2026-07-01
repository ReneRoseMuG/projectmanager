# Log: Meilenstein-Listen-Skalierung

**Datum:** 01.07.26  
**Uhrzeit:** 16:46:20  
**Schritt:** Fix — Meilenstein-Listen-Skalierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Der Pool-Queue-Überlauf bei großen Meilenstein-Listen wurde im Backend behoben. Ursache war das Listen-Mapping: Für jeden Meilenstein wurde der Projekt-Kontext einzeln nachgeladen, zusätzlich konnten verantwortliche Benutzer einzeln geladen werden. Das Mapping lädt Projekt-Kontexte und Benutzeroptionen nun gesammelt, während Counts und Tags weiter über die vorhandenen Bulk-Funktionen kommen. Dadurch bleiben `GET /api/milestones` und `GET /api/projects/:id/milestones` bei mindestens 500 Einträgen innerhalb weniger kontrollierter DB-Queries statt hunderte parallele Einzelqueries zu starten.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/api/src/services/milestones.service.ts` | geändert | Listen-Mapping auf Bulk-Kontexte für Projekt, Tags, Counts und Benutzer umgestellt |
| `apps/api/src/services/users.service.ts` | geändert | Bulk-Mapper `getUserOptionsMap` mit Cache-Nutzung ergänzt |
| `tests/integration/api/milestones.test.ts` | geändert | Integrationstest für 500 Meilensteine plus Gegenprojekt ergänzt |
| `logs/2026-07-01-16-46-20-fix-meilenstein-listen-skalierung.md` | neu | Schritt-Log für diesen Fix |
| `logs/README.md` | geändert | Log-Index um neuen Eintrag ergänzt |

## Testleitplanken und Testebenen

Angewendet wurden `planungsleitplanken` und `test-entwurfsleitplanken`. Testebene: Integration, echte Fastify-App, echte isolierte MySQL-Testdatenbank und keine Mocks. Bewiesenes Verhalten: Ausgangszustand mit 500 Meilensteinen in einem Projekt und 5 Gegenbeispielen in einem zweiten Projekt → HTTP-Listenrequests → vollständige Antworten mit Parent-/User-Daten und ohne Pool-Queue-Überlauf.

Ausgeführt:
- `npm run test -w apps/api -- tests/integration/api/milestones.test.ts` — 7 Tests grün
- `npm run typecheck -w apps/api` — grün

## Probleme und Abweichungen

Keine. Der vorhandene, noch uncommittete Nutzerstand in `milestones.service.ts` und `milestones.test.ts` mit `visibleParent` wurde erhalten und skalierbar gemacht.

## Offene Punkte / Folgeaufgaben

Keine.
