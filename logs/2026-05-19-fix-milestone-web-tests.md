# Log: Milestone-Web-Tests

**Datum:** 19.05.26  
**Schritt:** Fix — Milestone-Web-Tests  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die roten Web-Tests wurden als testseitige Ursachen eingeordnet und im Testcode behoben. Die Invalidierungs-Integrationstests erwarten nun den zusätzlich invalidierten Event-Scope, der durch Milestone- und Event-Owner-Beziehungen fachlich relevant ist. Die ProjectForm-Test-Fixtures mocken jetzt `useMilestones` analog zu den bestehenden Projekt-, Feature-, Ticket- und Owner-Hooks, sodass die Komponententests nicht ohne QueryClient in den echten Hook laufen. Zusätzlich wurde im ProjectForm-Tab-Test der neue Tab „Meilensteine“ als erwarteter Verwaltungs-Tab ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/queries/__tests__/invalidation.integration.test.ts` | geändert | Erwartete Invalidierung um `eventsList` ergänzt |
| `apps/web/src/components/test/ownerFormTestUtils.tsx` | geändert | Milestone-Fixture und `useMilestones`-Mock ergänzt |
| `apps/web/src/components/projects/__tests__/ProjectForm.test.tsx` | geändert | Erwartung für Tab „Meilensteine“ ergänzt |
| `logs/2026-05-19-fix-milestone-web-tests.md` | neu | Schritt-Log für den Test-Fix |
| `logs/README.md` | geändert | Log-Index aktualisiert |

## Probleme und Abweichungen

Keine. Beim Web-Testlauf erscheinen weiterhin React-Router-Future-Flag-Warnungen; sie verursachen keine roten Tests.

## Offene Punkte / Folgeaufgaben

Keine.
