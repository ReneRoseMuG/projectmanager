# Log: Query-Sync-Testabdeckung

**Datum:** 17.05.26  
**Schritt:** Feature — Query-Sync-Testabdeckung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Die Testabdeckung für die globale UI-Aktualität wurde um Integrationstests und Browsertests erweitert. Ein neuer Query-Integrationstest prüft mit einem echten TanStack `QueryClient`, dass Query-Keys eindeutig sind und die zentralen Invalidierungsfunktionen alle abhängigen Cache-Einträge für Collections, Details, Join-Tabellen, Relationen, Seitenlisten und globale Suche stale markieren. Ein neuer Hook-Integrationstest prüft, dass `useTasks`, `useProjectFeatureLinks` und `useTaskDocLinks` nach Mutationen refetchen und die sichtbaren Daten aktualisieren. Zusätzlich wurde ein neuer Playwright-Spec ergänzt, der Projekt-Detail-Flows für Task-Create/Delete, Projekt-Feature-Join-Änderungen, Backlog-Create/Update/Delete mit Filtern sowie Kommentare, Notizen und Dateien aus Nutzersicht absichert. Ein bestehender Projekt-E2E-Locator wurde auf eine exakte Heading-Prüfung geschärft, um Strict-Mode-Mehrfachtreffer zu vermeiden.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/src/queries/__tests__/invalidation.integration.test.ts` | neu | Query-Key- und Invalidierungsvertrag als QueryClient-Integrationstest |
| `apps/web/src/hooks/__tests__/queryMutations.integration.test.tsx` | neu | Hook-Mutations-Integration für Task-Collections und Feature-Relationen |
| `apps/web/e2e/freshness.spec.ts` | neu | Browser-Matrix für Counter, Listen, Boards, Filter, Collections und Relationen |
| `apps/web/e2e/project.spec.ts` | geändert | Projektlisten-Heading-Locator exakt gemacht |
| `logs/2026-05-17-feature-query-sync-testabdeckung.md` | neu | Schritt-Log für diese Testabdeckung |
| `logs/README.md` | geändert | Log-Index ergänzt |

## Probleme und Abweichungen

Keine Produktionscode-Änderungen waren nötig. Beim vollständigen E2E-Lauf trat ein bestehender Strict-Mode-Treffer in `project.spec.ts` auf, weil `Projekte` auch `Keine Projekte` matchte; das wurde testseitig mit `exact: true` korrigiert. Die Browsertests wurden seriell mit einem Worker ausgeführt, um State-Vermischung im gemeinsamen E2E-Runtime-Kontext auszuschließen.

## Offene Punkte / Folgeaufgaben

Keine.
