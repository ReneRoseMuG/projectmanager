# Log: Journal-Komponente

**Datum:** 21.05.26  
**Schritt:** Feature — Journal-Komponente  
**Status:** ⚠️ Teilweise abgeschlossen

## Was wurde umgesetzt

Die Projekt-Manager-App hat eine neue Journal-Infrastruktur für fachliche Domänen- und Support-Objekte erhalten. Das Journal speichert globale Einträge, objektbezogene Einträge, einzelne Feldänderungen und Kontextbezüge, sodass Aussagen wie „Projekt X hat ein neues Enddatum“ statt allgemeiner Null-Aussagen entstehen. Die API stellt geschützte Journal-Endpunkte mit `journal:read` bereit und die wichtigsten Domänen- und Support-Services schreiben Journal-Einträge für Create-, Update-, Delete- und Link-/Unlink-Aktionen. Im Frontend gibt es ein globales Journal über die Navigation sowie objektbezogene Journal-Ansichten in Projekt-, Meilenstein-, Task-, Ticket-, Feature-, Use-Case-, Wiki-, Backlog- und Termin-Kontexten. Die Architekturleitplanken in `agents.md` wurden um verbindliche Journal-Regeln für spätere Erweiterungen ergänzt.

## Geänderte / angelegte Dateien

| Datei | Art | Kurzbeschreibung |
|---|---|---|
| `packages/shared-types/src/index.ts` | geändert | Journal-Typen, Objektarten, Operationen und Permission-Ressource ergänzt |
| `apps/api/src/db/schema.ts` | geändert | Journal-Tabellen, Änderungs- und Kontexttabellen sowie Indizes ergänzt |
| `apps/api/src/db/migrations/0024_parallel_sleeper.sql` | neu | Migration für vorbereitende Schemaänderungen |
| `apps/api/src/db/migrations/0025_spicy_slipstream.sql` | neu | Migration für Journal-Tabellen |
| `apps/api/src/db/migrations/meta/*` | geändert/neu | Drizzle-Migrationsmetadaten aktualisiert |
| `apps/api/src/repositories/journal.repository.ts` | neu | Persistenzzugriffe für Journal-Einträge, Änderungen und Kontexte |
| `apps/api/src/services/journal.service.ts` | neu | Journal-Erzeugung, konkrete Änderungszusammenfassungen und Listenabfragen |
| `apps/api/src/routes/journal.ts` | neu | Geschützte API-Endpunkte für globales und objektbezogenes Journal |
| `apps/api/src/app.ts` | geändert | Journal-Route registriert |
| `apps/api/src/plugins/auth.ts` | geändert | Permission-Mapping für `/journal` ergänzt |
| `apps/api/src/services/*.ts` | geändert | Journal-Einträge in Domänen- und Support-Services integriert |
| `apps/api/src/routes/*.ts` | geändert | Aktorinformationen an journalisierte Service-Aufrufe übergeben |
| `apps/api/src/services/dump.service.ts` | geändert | Journal-Tabellen in Dump-/Restore-Export aufgenommen |
| `tests/fixtures/api/app.ts` | geändert | Journal-Route in Test-App registriert |
| `tests/fixtures/api/db.ts` | geändert | Journal-Tabellen in Test-Truncate und Drizzle-Schema aufgenommen |
| `apps/web/src/api/journal.ts` | neu | API-Clientfunktionen für Journal-Abfragen |
| `apps/web/src/hooks/useJournal.ts` | neu | TanStack-Query-Hooks für globales und objektbezogenes Journal |
| `apps/web/src/hooks/usePermissions.ts` | neu | Wiederverwendbare Permission-Helfer |
| `apps/web/src/components/journal/JournalPanel.tsx` | neu | Journal-Listenkomponente mit Zusammenfassung, Feldänderungen und Kontexten |
| `apps/web/src/pages/JournalPage.tsx` | neu | Globale Journal-Seite mit Filtern |
| `apps/web/src/App.tsx` | geändert | Route `/journal` ergänzt |
| `apps/web/src/components/layout/Sidebar.tsx` | geändert | Navigationspunkt „Journal“ mit Permission-Gating ergänzt |
| `apps/web/src/components/**/**Form.tsx` | geändert | Objektbezogene Journal-Ansichten in Detailformularen ergänzt |
| `apps/web/src/queries/queryKeys.ts` | geändert | Journal-Query-Keys ergänzt |
| `apps/web/src/queries/invalidation.ts` | geändert | Journal-Invalidierung an Domänenmutationen angebunden |
| `tests/unit/api/services/journal.service.test.ts` | neu | Unit-Tests für Journal-Zusammenfassungen und Wertformatierung |
| `tests/integration/api/journal.test.ts` | neu | API-Integrationstests für globale, objektbezogene und geschützte Journal-Abfragen |
| `tests/unit/web/components/journal/JournalPanel.test.tsx` | neu | UI-Unit-Tests für Journal-Anzeige und Empty State |
| `tests/integration/web/queries/invalidation.integration.test.ts` | geändert | Journal-Invalidierung nach Domänenänderungen abgesichert |
| `tests/browser/web/journal.spec.ts` | neu | Browser-Test für globales und projektbezogenes Journal |
| `agents.md` | geändert | Journal-Architekturrichtlinien und Handlungsanweisungen ergänzt |

## Probleme und Abweichungen

Der vollständige Web-Unitlauf ist noch nicht grün. `npm run test -w apps/web` meldet 324 Tests, davon 244 grün und 80 rot. Davon fallen 75 Tests in bestehenden Formular-Testdateien mit `No QueryClient set, use QueryClientProvider to set one`, weil die neu eingebundenen Journal-Tabs über `useHasPermission` auf `useAuth` und damit auf TanStack Query zugreifen, während diese Tests bisher ohne QueryClient gerendert wurden. Weitere 5 rote Tests liegen in `tests/unit/web/components/ui/tldraw-node.test.tsx` und betreffen ein bestehendes tldraw-Asset-/Mock-Problem. Gemäß Testregel wurden diese Fehler im Testlauf dokumentiert und nicht eigenständig behoben.

## Offene Punkte / Folgeaufgaben

Die betroffenen Formular-Unit-Tests sollten in einem Folgeauftrag über einen gemeinsamen Render-Helper mit `QueryClientProvider` und Auth-Testdaten aktualisiert werden. Danach ist der vollständige Web-Unitlauf erneut auszuführen. Optional kann in einem späteren Ausbau entschieden werden, ob Admin-/Katalogbereiche ebenfalls Journal-Einträge erhalten sollen; die aktuelle Umsetzung konzentriert sich auf fachliche Domänen- und Support-Objekte.
