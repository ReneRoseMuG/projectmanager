# Log: Global Query Sync

**Datum:** 17.05.26  
**Schritt:** Feature — Globale Query-Synchronisierung  
**Status:** ✅ Abgeschlossen

## Was wurde umgesetzt

Das Web-Frontend nutzt jetzt eine zentrale TanStack-Query-Schicht für Serverdaten, Query Keys und Invalidierungsregeln. Projekt-, Aufgaben-, Feature-, Use-Case-, Backlog-, Relations-, Kommentar-, Notiz-, Anhang-, Tag-, Wiki-, Kalender-, Seed- und Suchdaten wurden auf gemeinsame Query-/Mutation-Hooks umgestellt, sodass Mutationen fachliche Datenbereiche statt einzelner Komponenten aktualisieren. Die ursprünglich beobachtete stale Count-Situation in der Projekt-Detailseite wurde behoben, indem geladene leere Task-Listen als gültiger aktueller Zustand behandelt werden. Backlog-Status-Counter werden nun aus der vollständigen Collection abgeleitet und danach für die Anzeige gefiltert. Global Search lädt ihre Daten über einen eigenen Query-Hook und hängt dadurch ebenfalls an der zentralen Invalidierung.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `apps/web/package.json` | geändert | TanStack Query als Web-Dependency ergänzt |
| `package-lock.json` | geändert | Dependency-Lockfile aktualisiert |
| `apps/web/src/main.tsx` | geändert | QueryClientProvider in den App-Root integriert |
| `apps/web/src/queries/queryClient.ts` | neu | Zentraler QueryClient |
| `apps/web/src/queries/queryKeys.ts` | neu | Einheitliche Query Keys für Server-State |
| `apps/web/src/queries/invalidation.ts` | neu | Zentrale Invalidierungsregeln nach Mutationen |
| `apps/web/src/queries/queryErrors.ts` | neu | Einheitliche Fehlerableitung für Query-Hooks |
| `apps/web/src/hooks/*.ts` | geändert | Server-State-Hooks auf Query/Mutation umgestellt |
| `apps/web/src/hooks/useGlobalSearchData.ts` | neu | Query-Hook für globale Suchdaten |
| `apps/web/src/pages/ProjectDetailPage.tsx` | geändert | Task-Counter aus geladener Collection abgeleitet |
| `apps/web/src/pages/ProjectsPage.tsx` | geändert | Direkte Feature-Verknüpfungen invalidieren zentrale Query-Bereiche |
| `apps/web/src/components/backlog/BacklogListBoardView.tsx` | geändert | Statusfilter trennt vollständige Count-Basis von sichtbarer Liste |
| `apps/web/src/components/search/GlobalSearch.tsx` | geändert | Lokale Fetch-Effekte durch Query-Hook ersetzt |
| `apps/web/src/utils/projectTaskStats.ts` | neu | Getestete Ableitung der Projekt-Task-Statistiken |
| `apps/web/src/utils/__tests__/projectTaskStats.test.ts` | neu | Regressionstest für geladene leere Task-Listen |
| `apps/web/src/components/ui/__tests__/CommentThread.integration.test.tsx` | geändert | Test-Harness mit eigenem QueryClient ergänzt |

## Probleme und Abweichungen

Der erste TypeScript-Lauf zeigte ungültig typisierte Mutationsfunktionen, die synchron `null` oder `undefined` zurückgaben. Das wurde auf asynchrone Rückgaben umgestellt, damit die bisherigen Hook-Verträge erhalten bleiben. Der erste Lint-Lauf meldete unbenutzte Type-Imports aus der Umstellung; diese wurden entfernt. Der Web-Build meldet weiterhin nur eine große-Chunk-Warnung von Vite, aber keinen Fehler.

## Offene Punkte / Folgeaufgaben

Ein vollständiger Testlauf wurde noch nicht ausgeführt, weil dieser gemäß Abschluss-Workflow separat bestätigt werden soll. Eine spätere Performance-Optimierung der Bundle-Größe per Code-Splitting kann als eigener Folgeauftrag geprüft werden.
